const Banner=require("../models/bannerModel")
const BannerHelper=require('../helpers/bannerHelper')



const bannerList=async(req,res)=>{
    try{
        
        BannerHelper.bannerListHelper().then((response)=>{
            res.render('bannerList',{banners:response})

        })
    }catch(error){
        console.log(error)
    }
   
}

const addBannerQet=async(req,res)=>{
    try{
        res.render('addBanner')
    }catch(error){
        console.log(error)
    }
}
const addBannerPost = async (req, res) => {
    BannerHelper.addBannerHelper(req.body, req.file.filename).then((response) => {
        if (response) {
            res.redirect('/bannerList')
        } else {
            res.status(500).send('Error encountered');
        }
    })
}


const deleteBanner = async (req, res) => {
    BannerHelper.deleteBannerHelper(req.query.id).then((response) => {
        res.redirect('/admin/bannerList')
    })
}

const loaddupdateBanner=async(req,res)=>{
    BannerHelper.editBannerHelper(req.query.id).then((response) => {
        res.render('updateBanner', {banner: response[0]})
    })
}


const editBanner = async (req, res) => { 
    try {
        const bannerData = await Banner.findById(req.body.id)
        const updatedImage = req.file ? req.file.filename : bannerData.image;
        await BannerHelper.updateBannerHelper(req.body, updatedImage)
        res.redirect('/admin/bannerList')
    } catch (error) {
        console.log(error.message)
    }
}


module.exports={
    bannerList,
    addBannerQet,
    addBannerPost,
    deleteBanner,
    loaddupdateBanner,
    editBanner
   
}