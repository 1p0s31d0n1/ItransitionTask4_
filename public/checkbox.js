function checkingAll(source) {
    let checkboxes = document.getElementsByName('userCheckbox');
    for(let i = 0; i < checkboxes.length; i++) {
        checkboxes[i].checked = source.checked;
    }
}