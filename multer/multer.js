const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // cb(null, '../views/admin/assets/images/products/SavedPictures'); // Adjust the destination path as needed
        const destinationPath = path.resolve(__dirname, '../views/admin/assets/images/products/SavedPictures/');
        cb(null, destinationPath);
    },
    filename: function (req, file, cb) {
        const fileName = Date.now() + path.extname(file.originalname);
        cb(null, fileName);
    }
});

const fileFilter = (req, file, cb) => {
    // Allowed file types
    const fileTypes = /jpeg|jpg|png/;
    const mimetype = fileTypes.test(file.mimetype);

    if (mimetype) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only jpg, jpeg, and png are allowed.'), false);
    }
};

module.exports = {
    upload: multer({ 
        storage: storage,
        fileFilter: fileFilter,
        limits: {
            fileSize: 2 * 1024 * 1024 // setting the limit for each image to 2MB
        }
    }).array("images", 3),  // Allow a maximum of 3 images to be uploaded at once
};
