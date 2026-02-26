const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        let folderName = 'mockup-clone/misc';
        const fullPath = req.originalUrl.toLowerCase();

        if (file.fieldname === 'profile_picture_url') {
            folderName = 'mockup-clone/profile_pictures';
        } else if (file.fieldname === 'community_picture_url') {
            folderName = 'mockup-clone/community_pictures';
        } else if (file.fieldname === 'post_media' || file.fieldname === 'image') {
            folderName = 'mockup-clone/posts';
        } else if (file.fieldname === 'comment_media') {
            folderName = 'mockup-clone/comments';
        }

        // Determine allowed formats based on fieldname
        let allowedFormats = ['jpg', 'png', 'jpeg'];
        if (file.fieldname === 'comment_media' || file.fieldname === 'post_media' || file.fieldname === 'image') {
            // Allow videos for post and comment media
            allowedFormats = ['jpg', 'png', 'jpeg', 'mp4', 'webm', 'mov', 'ogg'];
        }

        return {
            folder: folderName,
            allowed_formats: allowedFormats,
            resource_type: file.fieldname === 'comment_media' || file.fieldname === 'post_media' || file.fieldname === 'image' 
                ? 'auto' // Cloudinary will auto-detect image vs video
                : 'image',
            public_id: `${Date.now()}-${file.originalname.split('.')[0]}`,
        };
    },
});

const upload = multer({ storage: storage });

module.exports = upload;