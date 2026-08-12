export const dasboard = async(req,res)=>{
   res.render("index");
}

export const overlay = async(req,res)=>{
   res.render("overlay",{uuid: req.params.uuid});
}