// <input type="file" id="uploaded_img" required></input>
// <input type="hidden" name="imgType" id="imgType">
// <input type="hidden" name="imgContent" id="imgContent"></input>

// <div class="image-preview" id="imagePreview">
//     <img src="" alt="Image preview" class="image-preview__image">
//     <span class="image-preview__default-text">Image preview</span>
// </div>

function init_image_preview(inpFile, previewContainer, imgContent, imgType){
    var previewImage = previewContainer.querySelector(".image-preview__image");
    var previewDefaultText = previewContainer.querySelector(".image-preview__default-text");

    inpFile.hidden = true;
    
    function imgReset(){
        inpFile.value = "";
        previewImage.setAttribute("src", "");
        previewImage.style.display = "none";
        previewDefaultText.style.display = "flex";
        imgContent.value = '';
        imgType.value = '';
    }

    previewContainer.addEventListener('click', ()=>{
        inpFile.click();
    })

    inpFile.addEventListener("change", function(){
        const file = this.files[0];
        if(file){
            if(file.size > 0x100000){return imgReset();}
            const reader = new FileReader();
            previewDefaultText.style.display = "none";
            previewImage.style.display = "block";
            reader.addEventListener("load", function(){
                previewImage.setAttribute("src", this.result);
                let data = this.result.split(';base64,');
                imgContent.value = data.pop();
                imgType.value = data.pop().slice(11);
            })
            reader.readAsDataURL(file);
        } else {imgReset();}
    });
}