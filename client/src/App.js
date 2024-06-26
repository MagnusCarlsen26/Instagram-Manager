import './App.css';
import axios from 'axios'
import { useState , useEffect } from 'react'

function App() {
    
    const [userId,setUserId] = useState(null)
    const [posts,setPosts] = useState([])
    const [caption, setCaption] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [mediaType,setMediaType] = useState(null)

    const fetchALlPosts = async(userId) => {
        try {
            const response = await axios.post('http://localhost:5000/fetchAllPosts',{ userId })
            if ( response.data.success ) {
                console.log(response.data.message.posts)
                setPosts(response.data.message.posts)
            } else { 
                console.error(`Error : fetchAllPosts : ${response.data.message.error}`)
            }
        } catch (error) {
            console.error(`Error : fetchAllPosts : ${error}`)
        }
    }

    const loginNow = async() => {
        try {
            const response = await axios.post('http://localhost:5000/loginNow')
            if ( response.data.success ) {
                console.log("Login Successful")
                console.log(response.data.message.userId)
                setUserId(response.data.message.userId)
                fetchALlPosts(response.data.message.userId)
            } else {
                console.error(response.data.message.error)
            }
        } catch (error) {
            console.error(`Error : loginNow : ${error}`)
        }
    }

    const handleSubmit = async (event) => {
        event.preventDefault();
    
        const formData = new FormData();
        formData.append('media', selectedFile);
        formData.append('mediaType', mediaType);
        formData.append('caption', caption);
    
        try {
          const response = await fetch('http://localhost:5000/publishMedia', {
            method: 'POST',
            body: formData
          });
    
          if (response.data.success) {
                console.log('Post Uploaded')
          } else {
            console.log('error')
          }
        } catch (error) {
          console.error('An error occurred during upload');
        }
      };

    return (
        <div className='app'>
            <div>
            {
                userId ? "" : <button type={'button'} onClick={loginNow} >Login to ig</button>
            }
            {/* {
                posts ? posts.map( post => {
                    var imgUrl
                    if (post.image_versions2 && post.image_versions2.candidates) {
                        imgUrl = post.image_versions2.candidates[0]
                    } else {
                        console.log("Image URLs not available for this post.")
                    }
                    return(
                        <div key ={post.id}>
                            <p>Taken at {post.taken_at}</p>
                            <p>Caption {post.caption?.text || ""}</p>
                            <img src={imgUrl.url} alt=''></img>
                            <p>Liked by :</p>
                            {
                                post.likers.map( liker => 
                                    <div key={post.id}>
                                        <p>Fullname ${liker.full_name}</p>
                                        <p>Username ${liker.username}</p>
                                        <img src={liker.profile_pic_url} alt=''></img>
                                    </div>
                                )
                            }
                        </div>
                )} ) : ""
            } */}
      <form onSubmit={handleSubmit}>
        <input type="file" onChange={(e) => setSelectedFile(e.target.files[0])} />
        <p> </p>
        <textarea value={mediaType} onChange={(e) => setMediaType(e.target.value)} placeholder="Media Type" />
        <p> </p>
        <textarea value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Enter caption" />
        <button type="submit">Publish</button>
      </form>
        </div>
        </div>
    );
}

export default App;
