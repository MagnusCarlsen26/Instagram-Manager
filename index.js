require('dotenv').config()
const { IgApiClient } = require('instagram-private-api')
const fs = require('fs')
const { log } = require('console')
const ig = new IgApiClient()

const username = process.env.IG_USERNAME;
const password = process.env.IG_PASSWORD;

async function login() {
  ig.state.generateDevice(username);
  await ig.simulate.preLoginFlow();
  return ig.account.login(username, password);
}

async function fetchAllUserPosts(userId) {
  const feed = ig.feed.user(userId);
  const allPosts = [];

  do {
    const items = await feed.items();
    allPosts.push(...items);
  } while (feed.isMoreAvailable());

  return allPosts
}

async function logPostDetails(post) {
  console.log(`Post ID: ${post.id}`)
  console.log(`Taken at ${post.taken_at}`)
  console.log(`Caption ${post.caption?.text || ""}`)
  if (post.image_versions2 && post.image_versions2.candidates) {
    const imgUrl = post.image_versions2.candidates[0]
    console.log(imgUrl.url)
  } else {
      console.log("Image URLs not available for this post.")
  }
  post.likers.forEach( element => {
    console.log(`Fullname ${element.full_name}`)
    console.log(`Username ${element.username}`)
    console.log(`ProfilePic ${element.profile_pic_url}`)
  })
  console.log('--------------------------')

}

async function publishMedia(mediaType, mediaPath, caption) {
  const mediaBuffer = fs.readFileSync(mediaPath)
  const publishOptions = { file: mediaBuffer, caption }

  try {
    const publishResult = await ig.publish[mediaType](publishOptions)
    console.log(`${mediaType.toUpperCase()} published successfully:`, publishResult)
  } catch (error) {
    console.error(`Error publishing ${mediaType}:`, error.message)
    console.error(error.response) 
  }
}

async function fetchUnreadDirectMessages(ig) {
  const directInboxFeed = ig.feed.directInbox()
  const threads = []
  const unreadMessages = []

  do {
    const newThreads = await directInboxFeed.items()
    threads.push(...newThreads)
  } while (directInboxFeed.isMoreAvailable())

  for (const thread of threads) {
    const threadEntity = DirectThreadEntity.createFromThread(ig, thread)
    const messages = await threadEntity.fetchItems()

    messages.forEach(message => {
      if (!message.read_state) {  
        unreadMessages.push({
          threadId: thread.thread_id,
          sender: message.user_id,
          timestamp: message.timestamp,
          text: message.text,
        })
      }
    })
  }

  return unreadMessages
}

async function sendDirectMessage(username, messageText) {
  const userId = await ig.user.getIdByUsername(username)
  const thread = ig.entity.directThread([userId.toString()])
  await thread.broadcastText(messageText)
}

async function fetchPostComments(postId) {
  try {
    const commentsFeed = ig.feed.mediaComments(postId);
    const allComments = [];

    do {
      const commentsChunk = await commentsFeed.items();
      allComments.push(...commentsChunk);
    } while (commentsFeed.isMoreAvailable());

    return allComments;
  } catch (error) {
    console.error(`Error fetching comments for post ${postId}:`, error.message);
    return []; // Return empty array in case of error
  }
}

async function replyToComment(postId, commentId, replyText) {
  try {
    await ig.media.comment({
      mediaId: postId,
      text: replyText,
      replyToCommentId: commentId,
    });
    console.log(`Replied to comment ${commentId} on post ${postId}`);
  } catch (error) {
    console.error(`Error replying to comment:`, error.message);
  }
}

async function manageCommentsForPost(post) {
  const postId = post.id;
  const comments = await fetchPostComments(postId);

  for (const comment of comments) {
    logPostDetails(post); // (Your existing function to log post details)
    console.log(`Comment by @${comment.user.username}: ${comment.text}`);
    
    // Example comment actions (you'll need to customize this logic)
    if (true) {
      replyToComment(postId, comment.pk, "Thanks for your question! I'll get back to you soon.");
    } else if (comment.user.username === 'spammer_account') {
      deleteComment(postId, comment.pk);
    }
  }
}


(async () => {
  try {
    const loginResponse = await login()

    if (loginResponse && loginResponse.pk) {
      console.log("Login successful!")
      const userId = loginResponse.pk

      const allPosts = await fetchAllUserPosts(userId);
      for (const post of allPosts) {
        await manageCommentsForPost(post);  // Process comments for each post
      }
    } else {
      console.error("Login failed:", loginResponse)
      process.exit(1)
    }
  } catch (error) {
    console.error('Error during login:', error)
    process.exit(1)
  }
})()
