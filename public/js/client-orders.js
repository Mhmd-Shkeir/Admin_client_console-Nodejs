
document.querySelectorAll(".price-btn").forEach((button) => {
    button.addEventListener("click", async function () {
        const orderId = this.getAttribute("data-order-id");
        const clientId = this.getAttribute("data-client-id");

        try {
            const response = await fetch(`/admin/client-cart/${clientId}/order-items?orderId=${orderId}`);
            const data = await response.json();

            if (data.success) {
                const itemsList = document.getElementById("items-list");
                itemsList.innerHTML = data.items
                    .map(item => `<div><strong>${item.product_name}</strong>: ${item.quantity} × $${parseFloat(item.price).toFixed(2)}</div>`)
                    .join('');
                document.getElementById("items-popup").style.display = "flex";
            } else {
                alert(data.message || 'Failed to load order items.');
            }
        } catch (error) {
            console.error("Error fetching order items:", error);
            alert('Failed to load order items. Please try again later.');
        }
    });
});

document.getElementById("close-popup").addEventListener("click", function () {
    document.getElementById("items-popup").style.display = "none";
});
