const getYoutubeEmbedUrl = (url) => {
    if (!url) return null;
    
    // Improved Regex to handle timestamps and 'si' tracking parameters
    const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = url.match(regExp);

    if (match && match[1]) {
        const videoId = match[1];
        // Always return HTTPS and add the 'origin' parameter to help with security
        return `https://www.youtube.com/embed/${videoId}?origin=${window.location.origin}`;
    }

    return null;
};

const extractCloudinaryImageId = (url) => {
    if (!url || typeof url !== 'string') return null;
    
    const parts = url.split('/');
    const index = parts.indexOf('mockup-clone');
    
    // If 'mockup-clone' isn't in the URL, the logic fails. 
    // Return null or the full ID depending on your fallback.
    if (index === -1) return null; 

    const folderAndFile = parts.slice(index).join('/');
    return folderAndFile.split('.')[0]; 
}

const extractPublicId = (url) => {
    if (!url || typeof url !== 'string') return null;
    
    // Extract public_id from Cloudinary URL
    // Format: https://res.cloudinary.com/{cloud_name}/{resource_type}/upload/{version}/{public_id}.{format}
    const parts = url.split('/');
    const uploadIndex = parts.findIndex(part => part === 'upload');
    
    if (uploadIndex === -1) return null;
    
    // Get everything after 'upload' and before the file extension
    const pathAfterUpload = parts.slice(uploadIndex + 1).join('/');
    const publicId = pathAfterUpload.split('.')[0];
    
    return publicId;
}

module.exports = { getYoutubeEmbedUrl, extractCloudinaryImageId, extractPublicId };