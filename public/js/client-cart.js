$(document).ready(function() {
    // Remove item from cart
    $('.remove-item').click(function() {
        var itemId = $(this).data('id');
        $.post('/remove-item', { itemId: itemId }, function(response) {
            if (response.success) {
                location.reload();
            }
        });
    });

    // Clear the entire cart
    $('#remove-all').click(function() {
        $.post('/remove-all', function(response) {
            if (response.success) {
                location.reload();
            }
        });
    });
});
