// <input type="file" id="uploaded_img" required></input>
// <input type="hidden" name="imgType" id="imgType">
// <input type="hidden" name="imgContent" id="imgContent"></input>

// <div class="image-preview" id="imagePreview">
//     <img src="" alt="Image preview" class="image-preview__image">
//     <span class="image-preview__default-text">Image preview</span>
// </div>

const inpFile = document.getElementById("uploaded_img");
const previewContainer = document.getElementById("imagePreview");
const previewImage = previewContainer.querySelector(".image-preview__image");
const previewDefaultText = previewContainer.querySelector(".image-preview__default-text");
const inputForm = document.getElementById("inpForm");

function imgReset(){
    inpFile.value = "";
    previewImage.setAttribute("src", "");
    previewImage.style.display = "none";
    previewDefaultText.style.display = "flex";
}

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
            document.getElementById('imgContent').value = data.pop();
            document.getElementById('imgType').value = data.pop().slice(11);
        })
        reader.readAsDataURL(file);
    } else {imgReset();}
});