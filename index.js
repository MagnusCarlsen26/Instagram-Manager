require('dotenv').config();
const { IgApiClient } = require('instagram-private-api');
const fs = require('fs');
const ig = new IgApiClient();
const username = process.env.IG_USERNAME;
const password = process.env.IG_PASSWORD;

(async () => {

  if (!username || !password) {
    console.error('Please set IG_USERNAME and IG_PASSWORD in your environment variables or .env file.');
    process.exit(1);
  }

  ig.state.generateDevice(username);
  try {
    await ig.simulate.preLoginFlow();
    const loginResponse = await ig.account.login(username, password);

    if (loginResponse && loginResponse.pk) { 
        console.log("Login successful!");
        console.log("User Info:", loginResponse); 
      } else {
        console.error("Login failed:", loginResponse);
        process.exit(1);
      }
  } catch (error) {
    console.error('Error during login:', error.message);
    process.exit(1);
  }

  // 3. Prepare Media and Caption
  const mediaType = 'image'; // 'image' or 'video' 
  const mediaPath = mediaType === 'image' 
    ? 'images.jpg' // Replace with your actual image path
    : 'path/to/your/video.mp4'; // Replace with your actual video path
  const mediaBuffer = fs.readFileSync(mediaPath);
  const caption = `Check out this ${mediaType}! #${mediaType}oftheday`; // Customize your caption

  try {
    let publishResult;
    if (mediaType === 'image') {
      publishResult = await ig.publish.photo({
        file: mediaBuffer,
        caption,
      });
    } else if (mediaType === 'video') {
      publishResult = await ig.publish.video({
        video: mediaBuffer,
        caption,
      });
    }

    console.log(`${mediaType.toUpperCase()} published successfully:`, publishResult);
  } catch (error) {
    console.error(`Error publishing ${mediaType}:`, error.message);
    console.error(error.response)
  }
})();
