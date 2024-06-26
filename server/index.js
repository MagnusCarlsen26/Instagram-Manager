import 'dotenv/config';  // Load environment variables
import { IgApiClient } from 'instagram-private-api';
import fs from 'fs';
import express from 'express'
import cors from 'cors'
import multer from 'multer'

const upload = multer()
const app = express()
const ig = new IgApiClient()

app.use(cors())
app.use(express.json())


const username = process.env.IG_USERNAME;
const password = process.env.IG_PASSWORD;

async function login() {
  ig.state.generateDevice(username);
  await ig.simulate.preLoginFlow();
  return ig.account.login(username, password);
}

// userId
app.post('/fetchALlPosts', async(req,res) => {
    try {

        const {userId} = req.body
        console.log(req.body)
        const feed = ig.feed.user(userId);
        const posts = [];
        
        do {
            const items = await feed.items();
            posts.push(...items);
        } while (feed.isMoreAvailable());
        
        res.json({ success : true , message : { posts } })
    }
    catch (error) {
        console.log(error)
        res.json({sucess : false , message : { error }})
    }
})

// Frontend API
// app.post('/logPostDetails', async(req,res) => {
//     console.log(`Post ID: ${post.id}`)
//     console.log(`Taken at ${post.taken_at}`)
//     console.log(`Caption ${post.caption?.text || ""}`)
//     if (post.image_versions2 && post.image_versions2.candidates) {
//       const imgUrl = post.image_versions2.candidates[0]
//       console.log(imgUrl.url)
//     } else {
//         console.log("Image URLs not available for this post.")
//     }
//     post.likers.forEach( element => {
//       console.log(`Fullname ${element.full_name}`)
//       console.log(`Username ${element.username}`)
//       console.log(`ProfilePic ${element.profile_pic_url}`)
//     })
//     console.log('--------------------------')
// })

// mediaType = [video,photo,story,carousel] , mediapath , caption
app.post('/publishMedia', upload.single('media') , async(req,res) => {
    try {
        const {mediaType,caption} = req.body
        console.log(mediaType)
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No media file provided' });
        }
        const mediaBuffer = req.file.buffer
        const publishOptions = { file: mediaBuffer, caption }
        const publishResult = await ig.publish[mediaType](publishOptions)
        console.log(`${mediaType} Uploaded`)
        res.json({sucess : true})
    } catch (error) {  
        res.json({success : false , message : error})
        console.error(`Error publishing ${mediaType}:`, error)
        console.error(error.response) 
    }
})

// async function fetchUnreadDirectMessages(ig) {
//   const directInboxFeed = ig.feed.directInbox()
//   const threads = []
//   const unreadMessages = []

//   do {
//     const newThreads = await directInboxFeed.items()
//     threads.push(...newThreads)
//   } while (directInboxFeed.isMoreAvailable())

//   for (const thread of threads) {
//     const threadEntity = DirectThreadEntity.createFromThread(ig, thread)
//     const messages = await threadEntity.fetchItems()

//     messages.forEach(message => {
//       if (!message.read_state) {  
//         unreadMessages.push({
//           threadId: thread.thread_id,
//           sender: message.user_id,
//           timestamp: message.timestamp,
//           text: message.text,
//         })
//       }
//     })
//   }

//   return unreadMessages
// }

// username , message
app.post('/sendDM',async(req,res) => {
    try{
        console.log(req.body)
        const {username,message} = req.body
        const userId = await ig.user.getIdByUsername(username)
        const thread = ig.entity.directThread([userId.toString()])
        await thread.broadcastText(message)
        res.json({ success : true })
    }catch(error) {
        res.json({ success : true , message : error })
    }
})

// post.id
app.post('/fetchPostComments',async(req,res) => {
    try {
        const {postId} = req.body
        const commentsFeed = ig.feed.mediaComments(postId);
        const allComments = [];
    
        do { 
          const commentsChunk = await commentsFeed.items();
          allComments.push(...commentsChunk);
        } while (commentsFeed.isMoreAvailable());
    
        res.json({success : true, message : allComments });
      } catch (error) {
        console.error(`Error fetching comments for post ${postId}:`, error.message);
        res.json({ success : false , message : { error } })
      }
})

// post.id ,  , message
app.post('/replyToComment', async(req,res) => {
    const {postId,commentId,replyText} = req.body
    try {
        await ig.media.comment({
          mediaId: postId,
          text: replyText,
          replyToCommentId: commentId,
        });
        res.json({ success : true })
        console.log(`Replied to comment ${commentId} on post ${postId}`);
      }
      catch (error) { res.json({ success : false , message : error }) }
})

// Frontend API
// async function manageCommentsForPost(post) {
//   const postId = post.id;
//   const comments = await fetchPostComments(postId);

//   for (const comment of comments) {
//     logPostDetails(post); // (Your existing function to log post details)
//     console.log(`Comment by @${comment.user.username}: ${comment.text}`);
    
//     // Example comment actions (you'll need to customize this logic)
//     if (true) {
//       replyToComment(postId, comment.pk, "Thanks for your question! I'll get back to you soon.");
//     } else if (comment.user.username === 'spammer_account') {
//       deleteComment(postId, comment.pk);
//     }
//   }
// }

app.post('/loginNow',async(req,res) => {
    try {
        const loginResponse = await login()
    
        if (loginResponse && loginResponse.pk) {
            const userId = loginResponse.pk
            res.send({ success : true , message : { userId } })
        } 
        else { console.error("Login failed:", loginResponse) }
    }
    catch (error) { 
        console.error('Error during login:', error)
    }  
})

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {  
  console.log(`Server is running on port ${PORT}`)
})