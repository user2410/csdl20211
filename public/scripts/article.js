document.querySelectorAll('.article').forEach(article => {
    article.innerHTML = article.innerHTML.replace('\n', '<br>');
})