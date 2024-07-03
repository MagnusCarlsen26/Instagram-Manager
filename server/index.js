import 'dotenv/config';  // Load environment variables
import { IgApiClient  } from 'instagram-private-api';
import express from 'express'
import fs from 'fs'
import cors from 'cors'
import multer from 'multer'

const storage = multer.memoryStorage();
const upload = multer()
const app = express()
const ig = new IgApiClient() 

app.use(cors())
app.use(express.json())

const username = process.env.IG_USERNAME;
const password = process.env.IG_PASSWORD;

async function login(username,password) {
  ig.state.generateDevice(username);
  await ig.simulate.preLoginFlow();
  return ig.account.login(username, password);
}

app.post('/fetchALlPosts', async(req,res) => {
    try {
        const {userId} = req.body
        console.log(`fetch ALl posts ${userId}`)
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

app.post('/publishPhoto', upload.single('image'), async (req, res) => {
    const photo = async() => {
        try {
            const { caption } = req.body;
            const imageFile = req.file.buffer;
    
            await ig.publish.photo({
                file: imageFile,
                caption: caption,
                // usertags : ,
                // location
            });
            res.json({ success: true });
        } catch (error) {
            if (error.message === 'Error: getaddrinfo ENOTFOUND i.instagram.com') {
                console.log('retrying')
                await video()
            } else {
                console.log(error)
                res.send( {success : false , message : error} )
            }
        }
    }
    try {
        await photo()
    } catch (error) {
        res.send( { success : false , message : error } )
        console.log(error)
    }

});  

app.post('/publishVideo', upload.fields([{ name: 'video', maxCount: 1 }, { name: 'image', maxCount: 1 }]), async (req, res) => {
    const video = async() => {
        try {
            console.log('Video')
            const { caption } = req.body;
            const videoFile = req.files['video'][0].buffer; // Get video file
            const coverImage = req.files['image'][0].buffer; // Get cover image (optional)
    
            await ig.publish.video({
                video: videoFile,
                coverImage: coverImage, // Only for reels
                caption: caption
            });
    
            res.json({ success: true });
        } catch (error) {
            if (error.message === 'Error: getaddrinfo ENOTFOUND i.instagram.com') {
                console.log('retrying')
                await video()
            } else {
                console.log(error)
                res.send( {success : false , message : error} )
            }
        }
    }
    try {
        await video()
    } catch (error) {
        res.send( { success : false , message : error } )
        console.log(error)
    }

});

app.post('/publishStoryVideo', upload.fields([{ name: 'video', maxCount: 1 }, { name: 'image', maxCount: 1 }]), async (req, res) => {
    try {
        console.log('StoryVideo')
        const { caption } = req.body;
        const videoFile = req.files['video'][0].buffer; // Get video file
        const coverImage = req.files['image'][0].buffer; // Get cover image (optional)

        await ig.publish.story({
            video: videoFile,
            coverImage: coverImage,
        });

        res.json({ success: true });
    } catch (error) {
        res.json({ success: false, message: error });
        console.error(error);
    }
});

app.post('/publishAlbum', upload.array('image'), async (req, res) => {
    try {
        const { caption } = req.body;
        const imageFiles = req.files.map(file => file.buffer);

        await ig.publish.album({
            items: imageFiles.map(imageFile => ({
                image: imageFile
            })),
            caption: caption,
            // location: ,
        });
        res.json({ success: true });
    } catch (error) {
        res.json({ success: false, message: error });
        console.error(error);
    }
});

app.post('/publishStoryPhoto', upload.array('image'), async (req, res) => {
    try {
        const { caption } = req.body;
        const imageFiles = req.files.map(file => file.buffer);

        await ig.publish.album({
            items: imageFiles.map(imageFile => ({
                image: imageFile
            })),
            caption: caption,
            // location: ,
        });
        res.json({ success: true });
    } catch (error) {
        res.json({ success: false, message: error });
        console.error(error);
    }
});

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

app.post('/loginNow',async(req,res) => {

    const loginNow = async(username,password) => {
        try {

            const loginResponse = await login(username,password)
            
            if (loginResponse && loginResponse.pk) {
                const userId = loginResponse.pk
                res.send({ success : true , message : { userId } })
            } 
            else { res.send({ success : false , message : loginResponse }) }
        } catch (error) {
            if (error.message === 'Error: getaddrinfo ENOTFOUND i.instagram.com') {
                console.log('retrying')
                await loginNow(username,password)
            } else {
                console.log(error)
                res.send( {success : false , message : error} )
            }
        }
    }
    try {
        await loginNow(username,password)
    } catch (error) {
        res.send( { success : false , message : error } )
        console.log(error)
    }
})

app.get('/hello',(req,res)=> {
    res.send("HEL WORLD")
})

const PORT = process.env.PORT || 5000 
  
app.listen(PORT, () => {  
  console.log(`Server is running on port ${PORT}`)
})