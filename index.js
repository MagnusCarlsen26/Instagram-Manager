require('dotenv').config();
const { IgApiClient } = require('instagram-private-api');
const fs = require('fs');
const { log } = require('console');
const ig = new IgApiClient();

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

  return allPosts;
}

async function logPostDetails(post) {
  console.log(`Post ID: ${post.id}`);
  console.log(`Taken at ${post.taken_at}`)
  console.log(`Caption ${post.caption?.text || ""}`)
  if (post.image_versions2 && post.image_versions2.candidates) {
    const imgUrl = post.image_versions2.candidates[0]
    console.log(imgUrl.url)
  } else {
      console.log("Image URLs not available for this post.");
  }
  const arr = post.likers
  arr.forEach( element => {
    console.log(`Fullname ${element.full_name}`)
    console.log(`Username ${element.username}`)
    console.log(`ProfilePic ${element.profile_pic_url}`)
  })
  console.log('--------------------------');

}

async function publishMedia(mediaType, mediaPath, caption) {
  const mediaBuffer = fs.readFileSync(mediaPath);
  const publishOptions = { file: mediaBuffer, caption };

  try {
    const publishResult = await ig.publish[mediaType === 'image' ? 'photo' : 'video'](publishOptions);
    console.log(`${mediaType.toUpperCase()} published successfully:`, publishResult);
  } catch (error) {
    console.error(`Error publishing ${mediaType}:`, error.message);
    console.error(error.response); // Include the API response for debugging
  }
}

(async () => {
  try {
    const loginResponse = await login();

    if (loginResponse && loginResponse.pk) {
      console.log("Login successful!");
      const userId = loginResponse.pk;

      try {
        const allPosts = await fetchAllUserPosts(userId);
        allPosts.forEach(logPostDetails)

      } catch (error) {
        console.error("Error fetching posts:", error.message);
        console.error(error.response);
      }

      // await publishMedia('image', 'images.jpg', 'Bitter Rain'); // Example usage

    } else {
      console.error("Login failed:", loginResponse);
      process.exit(1);
    }
  } catch (error) {
    console.error('Error during login:', error.message);
    process.exit(1);
  }
})();
