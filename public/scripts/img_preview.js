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

inpFile.addEventListener("change", function(){
    const file = this.files[0];
    if(file.size > 0x100000){
        inpFile.value = "";
        previewImage.setAttribute("src", "");
        previewDefaultText.style.display = initial;
        alert(`Image too large ${file.size}`)
        return;
    }
    if(file){
        const reader = new FileReader();
        previewDefaultText.style.display = "none";
        previewImage.style.display = "block";
        reader.addEventListener("load", function(){
            console.log(this);
            previewImage.setAttribute("src", this.result);
            let data = this.result.split(';base64,');
            document.getElementById('imgType').value = data.pop();
            document.getElementById('imgType').value = data.pop().slice(11);
        })
        reader.readAsDataURL(file);
    } else {
        previewDefaultText.style.display = null;
        previewImage.style.display = null;
    }
});