const EMAIL = 'mark.kuzmin@gmail.com';

function copyEmail() {
    navigator.clipboard.writeText(EMAIL).then(() => {
        showToast();
    });
}

function showToast() {
    const toast = document.getElementById('toast');
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
};