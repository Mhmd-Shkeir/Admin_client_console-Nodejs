const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const path = require("path");
const bcrypt = require("bcrypt");
const db = require("./db/db"); // Import the database connection
const router = express.Router();
const flash = require('connect-flash');
const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the 'public' directory
app.use(express.static("public"));

// Initialize session middleware
app.use(
    session({
        secret: "your-secret-key",
        resave: false,
        saveUninitialized: false
    })
);
app.use(flash());

app.use((req, res, next) => {
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        if (!req.session.user) {
            // Query the database to populate req.session.user if missing
            db.query("SELECT * FROM users WHERE id = ?", [req.session.userId], (err, results) => {
                if (err || results.length === 0) {
                    return res.send(`
                        <script>
                            alert("User session is invalid. Please log in again.");
                            window.location.href = "/login";
                        </script>
                    `);
                }
                req.session.user = results[0]; // Populate session user data
                return next(); // Continue to the next middleware/route handler
            });
        } else {
            return next(); // User data already in session, proceed
        }
    } else {
        return res.send(`
            <script>
                alert("You need to be logged in to access this page.");
                window.location.href = "/login";
            </script>
        `);
    }
}
// Centralized error handler middleware (after all routes)
app.use((err, req, res, next) => {
    console.error(err.stack);  // Log the error

    // Handle specific error types (optional)
    if (err.type === 'authentication') {
        return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // Handle generic errors (e.g., internal server error)
    const referer = req.get('Referer') || '/';  // Get the previous page URL or fallback to home page

    // Send an error response with a script for redirection
    return res.status(500).send(`
        <script>
            alert("Something went wrong!");
            window.location.href = "${referer}";  // Redirect to the previous page
        </script>
    `);
});


app.get("/", (req, res) => {
    const isLoggedIn = req.session.userId ? true : false; // Check if the user is logged in
    const user = req.session.userName; // Get user info from session (or any other info you need)

    db.query("SELECT * FROM products", (err, result) => {
        if (err) throw err;
        res.render("index", {
            products: result,
            isLoggedIn: isLoggedIn, // Pass the login status
            user: user // Pass the user info
        });
    });
});
app.get("/about", (req, res) => {
    res.render("about");
});

// app.get("/order-confirmation", (req, res) => {
//     res.render("order-confirmation");
// });

// Signup page
    app.get("/signup", (req, res) => {
        res.render("signup");
    });// Signup route
    app.post("/signup", async (req, res) => {
        const { name, email, password, role } = req.body;
        const hashedPassword = bcrypt.hashSync(password, 10);

        try {
            // First, check if the email already exists
            const [existingUser] = await db.promise().query(
                'SELECT * FROM users WHERE email = ?',
                [email]
            );

            if (existingUser.length > 0) {
                // If the email exists, return a message indicating the email is already in use
                return res.send(`
                    <script>
                        alert("Email already in use. Please choose another one.");
                        window.location.href = "/signup";
                    </script>
                `);
            }

            // Insert new user
            const [result] = await db.promise().query(
                "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'client')",
                [name, email, hashedPassword]
            );
            

            // Automatically log the user in
            const userId = result.insertId; // Get the new user's ID
            req.session.userId = userId;
            req.session.userName = name;

            return res.send(`
                <script>
                    alert("Signup successful! Welcome, ${name}.");
                    window.location.href = "/";
                </script>
            `);

        } catch (err) {
            console.error("Database error during user creation:", err);
            return res.send(`
                <script>
                    alert("An unexpected error occurred. Please try again later.");
                    window.location.href = "/signup";
                </script>
            `);
        }
    });
app.get('/signup-admin', (req, res) => {
    const user = req.session.user; // Assuming session stores the logged-in user
    if (user && user.role === 'admin') {
        res.render('signup-admin', { user });
    } else {
        res.redirect('/login');
    }
});
app.post('/signup-admin', async (req, res) => {
    const { name, email, password, role } = req.body;
    const user = req.session.user;

    if (!user || user.role !== 'admin') {
        return res.send(`
            <script>
                alert("Access denied. You must be an admin to perform this action.");
                window.location.href = "/login";
            </script>
        `);
    }

    try {
        // First, check if the email already exists
        const [existingUser] = await db.promise().query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (existingUser.length > 0) {
            // If the email exists, return a message indicating the email is already in use
            return res.send(`
                <script>
                    alert("Email already in use. Please choose another one.");
                    window.location.href = "/signup-admin";
                </script>
            `);
        }

        // Hash the password before storing it
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert the new user into the database
        await db.promise().query(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, role]
        );

        // Redirect to the admin profile page after successful user creation
        return res.send(`
            <script>
                alert("User created successfully!");
                window.location.href = "/profile";
            </script>
        `);
    } catch (err) {
        console.error('Error creating user:', err);
        return res.send(`
            <script>
                alert("An error occurred while creating the user. Please try again later.");
                window.location.href = "/signup-admin";
            </script>
        `);
    }
});

// Login page
app.get("/login", (req, res) => {
    res.render("login");
});
app.post("/login", (req, res) => {
    const { email, password } = req.body;

    db.query("SELECT * FROM users WHERE email = ?", [email], (err, results) => {
        if (err) {
            console.error("Login error:", err);
            return res.send(`
                <script>
                    alert("Server error. Please try again later.");
                    window.location.href = "/login";
                </script>
            `);
        }

        if (results.length > 0) {
            bcrypt.compare(password, results[0].password, (err, isMatch) => {
                if (err) {
                    console.error("Error comparing password:", err);
                    return res.send(`
                        <script>
                            alert("Server error. Please try again later.");
                            window.location.href = "/login";
                        </script>
                    `);
                }

                if (isMatch) {
                    req.session.userId = results[0].id;
                    req.session.userName = results[0].name; // Store user name in session
                    req.session.role = results[0].role; // Store user role in session
                    return res.redirect("/");
                } else {
                    return res.send(`
                        <script>
                            alert("Invalid credentials. Please check your email and password.");
                            window.location.href = "/login";
                        </script>
                    `);
                }
            });
        } else {
            return res.send(`
                <script>
                    alert("Invalid credentials. Please check your email and password.");
                    window.location.href = "/login";
                </script>
            `);
        }
    });
});
app.get("/logout", (req, res) => {

    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send("Error logging out");
        }
        res.redirect("/");
    });
});

app.post('/submit-feedback', isAuthenticated, (req, res) => {
    const { feedback } = req.body;
    const userId = req.session.user ? req.session.user.id : null;

    if (!isAuthenticated) {
        res.send(`
            <script>
                alert("You are not logged in!");
                window.location.href = "/login"; // Redirect to login page
            </script>
        `);
        return res.json({ success: false, message: 'You must be logged in to submit feedback.' });
    }

    if (!feedback || feedback.trim() === '') {
        console.error('Feedback submission attempted with empty feedback.');
        res.send(`
            <script>
                alert("Feedback submission attempted with empty feedback.");
                window.location.href = "/login"; // Redirect to login page
            </script>
        `);
        return res.json({ success: false, message: 'Feedback cannot be empty.' });
    }

    const query = 'INSERT INTO feedback (user_id, feedback_text) VALUES (?, ?)';
    db.query(query, [userId, feedback], (err, result) => {
        if (err) {
            console.error('Error inserting feedback into database:', err);
            return res.json({ success: false, message: 'Database error occurred while submitting feedback.' });
        }
        res.json({ success: true, message: 'Feedback submitted successfully!' });
    });
});
app.get('/feedbacks', async (req, res) => {
    try {
        const [feedbacks] = await db.promise().query(`
            SELECT u.name, f.feedback_text
            FROM feedback f
            JOIN users u ON f.user_id = u.id
            ORDER BY f.created_at DESC
        `);

        // Get the user from session (assuming you're storing the user info in the session)
        const user = req.session.user || null;

        // Pass user and feedbacks to the template
        res.render('feedbacks', { feedbacks, user });
    } catch (err) {
        console.error('Error fetching feedbacks:', err);
        res.send(`
            <script>
                alert("An error occurred while fetching feedbacks.");
                window.location.href = "/";
            </script>
        `);
    }
});





app.get("/profile", isAuthenticated, (req, res) => {
    const userId = req.session.userId;

    if (userId) {
        db.query("SELECT * FROM users WHERE id = ?", [userId], (err, results) => {
            if (err) throw err;

            const user = results[0];

            if (user.role === "admin") {
                // Query to get all admins except the one with id = 1
                db.query('SELECT * FROM users WHERE role = "admin" AND id != 1', (err, adminResults) => {
                    if (err) throw err;
            
                    // Query to get all wallet requests for the admin
                    db.query('SELECT * FROM wallet_requests', (err, walletRequests) => {
                        if (err) throw err;
            
                        db.query('SELECT * FROM users WHERE role = "client"', (err, clientResults) => {
                            if (err) throw err;
            
                            res.render("profile", {
                                user: user,
                                clients: clientResults,
                                admins: adminResults,  // This will only include admins excluding the one with id = 1
                                orders: [], // Admins don't see orders
                                requests: walletRequests, // Send wallet requests to the view
                            });
                        });
                    });
                });
            }
             else {
                db.query(
                    "SELECT id, total_price, created_at, status FROM orders WHERE user_id = ?",
                    [user.id],
                    (err, orderResults) => {
                        if (err) throw err;

                        res.render("profile", {
                            user: user,
                            clients: [], // Clients don't see other clients
                            orders: orderResults, // Pass orders for the client
                        });
                    }
                );
            }
        });
    } else {
        res.send(`
            <script>
                alert("You are not logged in!");
                window.location.href = "/login"; // Redirect to login page
            </script>
        `);
    }
});
app.post('/admin/handle-wallet-request', isAuthenticated, (req, res) => {
    const adminId = req.session.userId;
    const { requestId, action } = req.body;

    if (!requestId || !action) {
        return res.status(400).send({ success: false, error: "Request ID and action are required." });
    }

    db.query("SELECT role FROM users WHERE id = ?", [adminId], (err, result) => {
        if (err) return res.status(500).send({ success: false, error: "Database query error" });

        const userRole = result[0].role;
        if (userRole !== 'admin') {
            return res.status(403).send({ success: false, error: "Unauthorized action" });
        }

        const status = action === 'accept' ? 'approved' : 'rejected';

        db.query('UPDATE wallet_requests SET status = ? WHERE id = ?', [status, requestId], (err) => {
            if (err) return res.status(500).send({ success: false, error: "Failed to update request status" });

            // If the request is accepted, process the wallet payment
            if (action === 'accept') {
                // Get the client who made the request
                db.query('SELECT user_id, total_price FROM wallet_requests WHERE id = ?', [requestId], (err, result) => {
                    if (err || result.length === 0) return res.status(500).send({ success: false, error: "Failed to retrieve wallet request" });

                    const clientId = result[0].user_id;
                    const totalPrice = result[0].total_price;

                    // Get the cart items for the client
                    db.query('SELECT * FROM cart WHERE user_id = ?', [clientId], (err, cartItems) => {
                        if (err || cartItems.length === 0) return res.status(500).send({ success: false, error: "Failed to retrieve cart items" });

                        // Create order
                        db.query('INSERT INTO orders (user_id, total_price, status) VALUES (?, ?, "completed")', [clientId, totalPrice], (err, result) => {
                            if (err) return res.status(500).send({ success: false, error: "Failed to create order" });

                            const orderId = result.insertId;

                            // Insert order items
                            const insertOrderItemsQuery = 'INSERT INTO order_items (order_id, product_name, quantity, price) VALUES ?';
                            const orderItems = cartItems.map(item => [orderId, item.name, item.quantity, item.price]);

                            db.query(insertOrderItemsQuery, [orderItems], (err) => {
                                if (err) return res.status(500).send({ success: false, error: "Failed to insert order items" });

                                // Clear the cart after successful order
                                db.query('DELETE FROM cart WHERE user_id = ?', [clientId], (err) => {
                                    if (err) return res.status(500).send({ success: false, error: "Failed to clear cart" });

                                    // Handle payment (even if it’s wallet payment)
                                    const paymentQuery = `
                                        INSERT INTO payments (user_id, total) VALUES (?, ?)
                                    `;
                                    db.query(paymentQuery, [clientId, totalPrice], (err) => {
                                        if (err) return res.status(500).send({ success: false, error: "Failed to record payment" });

                                        // Success response
                                        res.send({
                                            success: true,
                                            message: 'Order successfully placed, and payment processed via wallet!',
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            } else {
                // If the request is rejected, just proceed with the rejection process
                res.send({ success: true, status });
            }

            // Always delete the wallet request after processing, whether accepted or rejected
            db.query('DELETE FROM wallet_requests WHERE id = ?', [requestId], (err) => {
                if (err) return res.status(500).send({ success: false, error: "Failed to delete wallet request" });

                console.log(`Wallet request with ID ${requestId} deleted successfully.`);
            });
        });
    });
});
// Route to handle profile updates
app.post('/profile/update', (req, res) => {
    const { name, email } = req.body;
    const userId = req.session.user.id;

    db.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId], (err, results) => {
        if (err) {
            console.error(err);
            return res.json({ success: false, message: 'Database error. Please try again later.' });
        }

        if (results.length > 0) {
            return res.json({ success: false, message: 'Email is already in use.' });
        }

        db.query('UPDATE users SET name = ?, email = ? WHERE id = ?', [name, email, userId], (err, updateResults) => {
            if (err) {
                console.error(err);
                return res.json({ success: false, message: 'Database error. Please try again later.' });
            }

            res.json({ success: true, message: 'Profile updated successfully.' });
        });
    });
});
app.get('/admin/get-client-info/:userId', isAuthenticated, (req, res) => {
    const userId = req.params.userId;

    // Fetch client information from the database
    db.query('SELECT name, email, phone, address FROM users WHERE id = ?', [userId], (err, results) => {
        if (err) return res.json({ success: false, error: 'Database error' });

        if (results.length > 0) {
            res.json({ success: true, client: results[0] });
        } else {
            res.json({ success: false, error: 'Client not found' });
        }
    });
});
app.delete('/delete-account', isAuthenticated, (req, res) => {
    const userId = req.session.userId;

    if (!userId) {
        return res.status(403).json({ success: false, message: "You are not logged in." });
    }

    // Delete data from related tables in the correct order
    db.query('DELETE FROM cart WHERE user_id = ?', [userId], (err) => {
        if (err) return res.status(500).json({ success: false, message: "Error deleting cart items." });

        db.query('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id = ?)', [userId], (err) => {
            if (err) return res.status(500).json({ success: false, message: "Error deleting order items." });

            db.query('DELETE FROM orders WHERE user_id = ?', [userId], (err) => {
                if (err) return res.status(500).json({ success: false, message: "Error deleting orders." });

                db.query('DELETE FROM payments WHERE user_id = ?', [userId], (err) => {
                    if (err) return res.status(500).json({ success: false, message: "Error deleting payments." });

                    db.query('DELETE FROM users WHERE id = ?', [userId], (err) => {
                        if (err) return res.status(500).json({ success: false, message: "Error deleting user account." });

                        // Destroy the session and respond
                        req.session.destroy(() => {
                            res.json({ success: true, message: "Account deleted successfully." });
                        });
                    });
                });
            });
        });
    });
});
app.get('/admin/switch-to-client/:id', (req, res) => {
    const adminId = req.params.id;

    // Update admin to client in the database
    db.query('UPDATE users SET role = "client" WHERE id = ?', [adminId], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error updating role.');
        }
        res.redirect('/profile'); // Redirect back to the admin page
    });
});
app.get('/admin/switch-to-admin/:id', (req, res) => {
    const clientId = req.params.id;

    // Update client to admin in the database
    db.query('UPDATE users SET role = "admin" WHERE id = ?', [clientId], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error updating role.');
        }
        res.redirect('/profile'); // Redirect back to the admin page
    });
});
//admin-client-cart
function getCartItemsForClient(clientId, callback) {
    const query = "SELECT * FROM cart WHERE user_id = ?";
    db.query(query, [clientId], (err, rows) => {
        if (err) {
            console.error("Error fetching cart items:", err);
            return callback(err, null); // Return error to the callback
        }
        callback(null, rows); // Return the rows (cart items) to the callback
    });
}
app.get("/admin/client-cart/:clientId", async (req, res) => {
    const userId = req.session.userId;
    const clientId = req.params.clientId;

    if (userId) {
        try {
            // Fetching the cart items for the client
            const cartItems = await new Promise((resolve, reject) => {
                getCartItemsForClient(clientId, (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                });
            });

            // Fetching the products for the dropdown
            const productsQuery = "SELECT * FROM products";
            db.query(productsQuery, (err, products) => {
                if (err) {
                    console.error("Error fetching products:", err);
                    return res.status(500).send("Error fetching products");
                }

                const total = cartItems.length > 0
                    ? cartItems.reduce((sum, item) => {
                        const price = parseFloat(item.price);
                        return sum + price * item.quantity;
                    }, 0)
                    : 0;

                res.render("admin-client-cart", {
                    clientId,
                    cartItems,
                    total,
                    products,  // Pass products to the view
                });
            });
        } catch (err) {
            console.error("Error fetching cart items:", err);
            res.status(500).send("Error fetching cart items");
        }
    } else {
        res.send(`
            <script>
                alert("You are not logged in!");
                window.location.href = "/login"; // Redirect to login page
            </script>
        `);
    }
});
app.post("/admin/client-cart/:clientId/remove-item", (req, res) => {
    const clientId = req.params.clientId;
    const { itemId } = req.body;

    db.query(
        "DELETE FROM cart WHERE user_id = ? AND item_id = ?",
        [clientId, itemId],
        (err, result) => {
            if (err) {
                console.error("Error removing item:", err);
                return res.json({ success: false, message: "Error removing item" });
            }
            res.json({ success: result.affectedRows > 0 });
        }
    );
});
app.post("/admin/client-cart/:clientId/remove-all", (req, res) => {
    const clientId = req.params.clientId;

    db.query("DELETE FROM cart WHERE user_id = ?", [clientId], (err, result) => {
        if (err) {
            console.error("Error clearing cart:", err);
            return res.status(500).json({ success: false, message: "Error clearing cart" });
        }

        // Check if items were actually removed
        if (result.affectedRows > 0) {
            return res.json({ success: true, message: "Cart cleared successfully" });
        } else {
            return res.json({ success: false, message: "No items to clear in the cart" });
        }
    });
});
// Admin adding item to a client's cart
app.post("/admin/client-cart/:clientId/add-item", (req, res) => {
    const { productId, quantity, price } = req.body;
    const clientId = req.params.clientId;

    if (!productId || !quantity || !price || !clientId) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // Check if the item already exists in the client's cart
    const checkQuery = "SELECT quantity FROM cart WHERE user_id = ? AND item_id = ?";
    db.query(checkQuery, [clientId, productId], (err, results) => {
        if (err) {
            console.error("Error checking item existence:", err);
            return res.status(500).json({ success: false, message: "Database error" });
        }

        if (results.length > 0) {
            // Item exists, update the quantity
            const existingQuantity = results[0].quantity;
            const newQuantity = existingQuantity + parseInt(quantity, 10);

            const updateQuery = `
                UPDATE cart
                SET quantity = ?, price = ?
                WHERE user_id = ? AND item_id = ?
            `;
            db.query(updateQuery, [newQuantity, price, clientId, productId], (updateErr) => {
                if (updateErr) {
                    console.error("Error updating item quantity:", updateErr);
                    return res.status(500).json({ success: false, message: "Error updating item quantity" });
                }

                return res.json({ success: true, message: "Item quantity updated successfully" });
            });
        } else {
            // Item does not exist, insert it into the cart
            const insertQuery = `
                INSERT INTO cart (user_id, item_id, quantity, price, name)
                SELECT ?, ?, ?, ?, name FROM products WHERE id = ?
            `;
            db.query(insertQuery, [clientId, productId, quantity, price, productId], (insertErr) => {
                if (insertErr) {
                    console.error("Error adding item to cart:", insertErr);
                    return res.status(500).json({ success: false, message: "Error adding item to cart" });
                }

                return res.json({ success: true, message: "Item added to cart successfully" });
            });
        }
    });
});
app.post("/admin/client-cart/:clientId/update-quantity", (req, res) => {
    const { itemId, change } = req.body;
    const clientId = req.params.clientId;

    if (!itemId || !change || !clientId) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // First, retrieve the current quantity of the item
    const getQuery = "SELECT quantity, price FROM cart WHERE user_id = ? AND item_id = ?";
    db.query(getQuery, [clientId, itemId], (err, results) => {
        if (err) {
            console.error("Error retrieving item:", err);
            return res.status(500).json({ success: false, message: "Error retrieving item" });
        }

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: "Item not found in cart" });
        }

        const currentQuantity = results[0].quantity;
        const price = results[0].price;
        const newQuantity = currentQuantity + parseInt(change, 10);

        if (newQuantity <= 0) {
            return res.status(400).json({ success: false, message: "Quantity cannot be less than 1" });
        }

        // Update the quantity in the database
        const updateQuery = "UPDATE cart SET quantity = ? WHERE user_id = ? AND item_id = ?";
        db.query(updateQuery, [newQuantity, clientId, itemId], (updateErr) => {
            if (updateErr) {
                console.error("Error updating quantity:", updateErr);
                return res.status(500).json({ success: false, message: "Error updating quantity" });
            }

            res.json({
                success: true,
                message: "Quantity updated successfully",
                newQuantity,
                itemPrice: price,
            });
        });
    });
});
function isAdmin(req, res, next) {
    if (req.session && req.session.role === 'admin') {  // Check if the user role is 'admin'
        return next();
    } else {
        return res.send("Permission denied");
    }
}
app.get('/admin/admin-cl-checkout/:clientId', isAuthenticated, isAdmin, (req, res) => {
    const clientId = req.params.clientId;

    // Query to fetch the cart items of the client, not the admin's cart
    db.query(
        'SELECT c.id, c.name, c.quantity, c.price, p.name AS product_name ' +
        'FROM cart c ' +
        'JOIN products p ON c.item_id = p.id ' +
        'WHERE c.user_id = ?',
        [clientId], // Pass the clientId here to get the client's cart
        (err, cartItems) => {
            if (err) {
                console.error('Error fetching cart items:', err);
                return res.status(500).send('Error fetching cart items');
            }

            if (cartItems.length === 0) {
                return res.send(`
                    <script>
                        alert("The cart is empty.");
                        window.location.href = "/admin/client-cart/${clientId}"; // Redirect back to cart
                    </script>
                `);
            }

            // Calculate the total price of the cart
            const totalPrice = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);

            // Render the checkout page with client-specific cart data
            res.render('admin-cl-checkout', { clientId, cartItems, totalPrice });
        }
    );
});
app.post('/admin/admin-cl-checkout/:clientId/confirm', isAdmin, (req, res) => {
    const clientId = req.params.clientId;
    const { cardHolder, expMonth, expYear, cardNumber, cvc } = req.body;

    // Check if payment method is wallet (if card details are empty and the user selected wallet)
    const isWalletPayment = !cardHolder && !expMonth && !expYear && !cardNumber && !cvc;

    console.log(`Processing checkout for client ID: ${clientId}`);

    // Step 1: Fetch the cart items for the client
    db.query(
        'SELECT c.id, c.quantity, c.price, p.name AS product_name ' +
        'FROM cart c ' +
        'JOIN products p ON c.item_id = p.id ' +
        'WHERE c.user_id = ?',
        [clientId],
        (err, cartItems) => {
            if (err) {
                console.error('Error fetching cart items:', err);
                return res.status(500).send('Error fetching cart items');
            }

            console.log(`Fetched ${cartItems.length} items for client ID: ${clientId}`);

            if (cartItems.length === 0) {
                return res.status(400).send('The client\'s cart is empty.');
            }

            // Step 2: Calculate total price
            const totalPrice = cartItems.reduce((total, item) => total + (parseFloat(item.price) * item.quantity), 0);
            console.log(`Total price calculated for checkout: $${totalPrice.toFixed(2)}`);

            // Step 3: Create a new order
            db.query(
                'INSERT INTO orders (user_id, total_price, status) VALUES (?, ?, "completed")',
                [clientId, totalPrice],
                (err, result) => {
                    if (err) {
                        console.error('Error creating order:', err);
                        return res.status(500).send('Error creating order');
                    }

                    const orderId = result.insertId;
                    console.log(`Order created with ID: ${orderId}`);

                    // Step 4: Insert order items into the order_items table
                    cartItems.forEach(item => {
                        db.query(
                            'INSERT INTO order_items (order_id, product_name, quantity, price) VALUES (?, ?, ?, ?)',
                            [orderId, item.product_name, item.quantity, item.price],
                            (err) => {
                                if (err) {
                                    console.error('Error adding order item:', err);
                                    return res.status(500).send('Error adding order items');
                                }
                            }
                        );
                    });

                    // Step 5: Create a payment entry, check if it's a wallet payment
                    if (isWalletPayment) {
                        // Skip card details and create a payment with only the total
                        db.query(
                            'INSERT INTO payments (card_holder, card_number, exp_month, exp_year, cvc, user_id, total) ' +
                            'VALUES (?, ?, ?, ?, ?, ?, ?)',
                            [null, null, null, null, null, clientId, totalPrice],
                            (err) => {
                                if (err) {
                                    console.error('Error processing wallet payment:', err);
                                    return res.status(500).send('Error processing payment');
                                }
                                console.log(`Wallet payment processed for client ID: ${clientId}`);
                            }
                        );
                    } else {
                        // Handle credit card payment
                        db.query(
                            'INSERT INTO payments (card_holder, card_number, exp_month, exp_year, cvc, user_id, total) ' +
                            'VALUES (?, ?, ?, ?, ?, ?, ?)',
                            [cardHolder, cardNumber, expMonth, expYear, cvc, clientId, totalPrice],
                            (err) => {
                                if (err) {
                                    console.error('Error processing payment:', err);
                                    return res.status(500).send('Error processing payment');
                                }
                                console.log(`Payment processed for client ID: ${clientId}`);
                            }
                        );
                    }

                    // Step 6: Delete items from the client's cart after checkout
                    db.query(
                        'DELETE FROM cart WHERE user_id = ?',
                        [clientId],
                        (err) => {
                            if (err) {
                                console.error('Error removing items from cart:', err);
                            } else {
                                console.log(`Items removed from cart for client ID: ${clientId}`);
                            }

                            // Step 7: Redirect to the orders page
                            res.redirect(`/admin/client-orders/${clientId}`);
                        }
                    );
                }
            );
        }
    );
});
//admin-client-order
app.get("/admin/client-orders/:id", isAuthenticated, (req, res) => {
    const clientId = req.params.id;

    // Ensure only admin users can access this route
    if (req.session.role !== "admin") {
        return res.send(`
            <script>
                alert("Unauthorized access!");
                window.location.href = "/";
            </script>
        `);
    }

    // Fetch all orders and include the client's name
    db.query(
        `SELECT orders.id, orders.total_price, orders.created_at, orders.status, users.name AS client_name 
         FROM orders 
         JOIN users ON orders.user_id = users.id 
         WHERE orders.user_id = ?`,
        [clientId],
        (err, results) => {
            if (err) {
                console.error("Error fetching client orders:", err);
                return res.status(500).send("Server error");
            }

            res.render("client-orders", {
                orders: results,
                clientId: clientId, // Pass the client ID to identify whose orders these are
            });
        }
    );
});
app.get("/admin/delete-user/:id", isAuthenticated, (req, res) => {
    const userId = req.params.id;

    // Check if the logged-in user is an admin
    if (req.session.role !== "admin") {
        return res.send(`
            <script>
                alert("You are not authorized to perform this action.");
                window.location.href = "/profile";
            </script>
        `);
    }

    // Step 1: Delete from `payments`
    const deletePaymentsQuery = "DELETE FROM payments WHERE user_id = ?";
    db.query(deletePaymentsQuery, [userId], (err) => {
        if (err) {
            console.error("Error deleting payments:", err);
            return res.send(`
                <script>
                    alert("An error occurred while deleting user payments.");
                    window.location.href = "/profile";
                </script>
            `);
        }

        // Step 2: Delete from `order_items` based on `orders` linked to the user
        const deleteOrderItemsQuery = `
            DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id = ?)
        `;
        db.query(deleteOrderItemsQuery, [userId], (err) => {
            if (err) {
                console.error("Error deleting order items:", err);
                return res.send(`
                    <script>
                        alert("An error occurred while deleting user order items.");
                        window.location.href = "/profile";
                    </script>
                `);
            }

            // Step 3: Delete from `orders`
            const deleteOrdersQuery = "DELETE FROM orders WHERE user_id = ?";
            db.query(deleteOrdersQuery, [userId], (err) => {
                if (err) {
                    console.error("Error deleting orders:", err);
                    return res.send(`
                        <script>
                            alert("An error occurred while deleting user orders.");
                            window.location.href = "/profile";
                        </script>
                    `);
                }

                // Step 4: Delete from `cart`
                const deleteCartQuery = "DELETE FROM cart WHERE user_id = ?";
                db.query(deleteCartQuery, [userId], (err) => {
                    if (err) {
                        console.error("Error deleting cart items:", err);
                        return res.send(`
                            <script>
                                alert("An error occurred while deleting user cart items.");
                                window.location.href = "/profile";
                            </script>
                        `);
                    }

                    // Step 5: Finally, delete from `users`
                    const deleteUserQuery = "DELETE FROM users WHERE id = ?";
                    db.query(deleteUserQuery, [userId], (err) => {
                        if (err) {
                            console.error("Error deleting user:", err);
                            return res.send(`
                                <script>
                                    alert("An error occurred while deleting the user.");
                                    window.location.href = "/profile";
                                </script>
                            `);
                        }

                        // Success message
                        res.send(`
                            <script>
                                alert("User account deleted successfully.");
                                window.location.href = "/profile";
                            </script>
                        `);
                    });
                });
            });
        });
    });
});
// Route to fetch order items for a specific client by the admin
app.get('/admin/client-cart/:clientId/order-items', isAuthenticated, (req, res) => {
    const adminId = req.session.userId; // Get admin user ID from session
    const clientId = req.params.clientId; // Get client ID from URL parameters
    const orderId = req.query.orderId; // Get order ID from query string

    // Ensure the admin is authorized to view the client's data (if needed)
    if (req.session.role !== 'admin') {
        return res.json({ success: false, message: 'Access denied. Admins only.' });
    }

    // Validate that both clientId and orderId are provided
    if (!clientId || !orderId) {
        return res.json({ success: false, message: 'Missing order or client information.' });
    }

    // Query to fetch order items for the specific client and order
    const query = `
        SELECT oi.product_name, oi.quantity, oi.price
        FROM order_items oi
        INNER JOIN orders os ON oi.order_id = os.id
        WHERE os.user_id = ? AND os.id = ?
    `;

    db.query(query, [clientId, orderId], (err, results) => {
        if (err) {
            console.error("Database error occurred:", err);
            return res.json({ success: false, message: 'Failed to load order items. Please try again later.' });
        }

        if (results.length === 0) {
            return res.json({ success: false, message: 'No items found for this order.' });
        }

        // Successfully fetched the order items
        res.json({ success: true, items: results });
    });
});



// Cart page
app.get("/cart", (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
        return res.redirect("/login");
    }

    db.query("SELECT * FROM cart WHERE user_id = ?", [userId], (err, result) => {
        if (err) return res.status(500).send("Error fetching cart");

        const total = result.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
        );
        res.render("cart", { cartItems: result, total: total });
    });
});
app.post('/cart/update', (req, res) => {
    const { itemId, quantity } = req.body;

    if (!itemId || isNaN(quantity)) {
        return res.status(400).send('Invalid item or quantity');
    }

    const userId = req.session.userId;

    // Update the cart item in the database
    db.query(
        'UPDATE cart SET quantity = ? WHERE item_id = ? AND user_id = ?',
        [quantity, itemId, userId],
        (err, result) => {
            if (err) {
                return res.status(500).send('Error updating cart');
            }

            res.send('Cart updated successfully');
        }
    );
});
// Add item to cart
app.post("/add-to-cart", (req, res) => {
    const { itemId, name, price } = req.body;
    const userId = req.session.userId;

    if (!userId) {
        return res
            .status(401)
            .json({
                success: false,
                message: "You must be logged in to add items to the cart",
            });
    }

    db.query(
        "SELECT * FROM cart WHERE user_id = ? AND item_id = ?",
        [userId, itemId],
        (err, result) => {
            if (err)
                return res
                    .status(500)
                    .json({ success: false, message: "Error checking cart" });

            if (result.length > 0) {
                db.query(
                    "UPDATE Cart SET quantity = quantity + 1 WHERE user_id = ? AND item_id = ?",
                    [userId, itemId],
                    (err) => {
                        if (err)
                            return res
                                .status(500)
                                .json({ success: false, message: "Error updating cart" });
                        res.json({ success: true, message: "Item quantity updated" });
                    }
                );
            } else {
                db.query(
                    "INSERT INTO Cart (user_id, item_id, name, price, quantity) VALUES (?, ?, ?, ?, ?)",
                    [userId, itemId, name, price, 1],
                    (err) => {
                        if (err) {
                            return res
                                .status(500)
                                .json({ success: false, message: "Error adding item to cart!" })
                                .redirect('/login'); // Redirect to the login page if there's an error
                        }
                        res.json({ success: true, message: "Item added to cart" });
                    }
                );
            }
        }
    );
});
// Remove an item from the cart
app.post("/remove-item", (req, res) => {
    const { itemId } = req.body;
    const userId = req.session.userId;

    if (!userId) {
        return res.status(401).send("User not logged in.");
    }

    db.query(
        "DELETE FROM Cart WHERE item_id = ? AND user_id = ?",
        [itemId, userId],
        (err) => {
            if (err) return res.status(500).send("Error removing item.");
            res.json({ success: true });
        }
    );
});
// Remove all items from the cart
app.post("/remove-all", (req, res) => {
    const userId = req.session.userId;
    if (!userId) return res.status(401).send("User not logged in.");

    db.query("DELETE FROM Cart WHERE user_id = ?", [userId], (err) => {
        if (err) return res.status(500).send("Error clearing cart.");
        res.json({ success: true });
    });
});



// Route to display the checkout page
app.get('/checkout', isAuthenticated, (req, res) => {
    // Check if the admin is processing for a client
    const clientId = req.query.clientId;
    const userId = clientId || req.session.userId; // Use clientId if provided, otherwise userId from session

    const query = 'SELECT * FROM cart WHERE user_id = ?';
    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Database error');
        }

        if (results.length === 0) {
            return res.send(`
                <script>
                    alert("The cart is empty.");
                    window.location.href = "/cart"; // Redirect back to cart
                </script>
            `);
        }

        const cartItems = results.map(item => ({
            ...item,
            price: parseFloat(item.price), // Ensure price is a number
        }));

        const totalPrice = cartItems.reduce((total, item) => {
            return total + (item.price * item.quantity);
        }, 0);

        res.render('checkout', { cartItems, totalPrice, isAdmin: !!clientId, clientId });
    });
});
// Route to handle payment confirmation
app.post('/checkout/confirm', isAuthenticated, (req, res) => {
    const clientId = req.body.clientId;
    const userId = clientId || req.session.userId; // Admin processes for client, otherwise session userId
    const { isWalletPayment, cardHolder, cardNumber, expMonth, expYear, cvc } = req.body;

    const getUserRoleQuery = 'SELECT role FROM users WHERE id = ?'; // Assuming `role` column exists in `users` table
    db.query(getUserRoleQuery, [userId], (err, results) => {
        if (err) {
            console.error("Error fetching user role:", err);
            return res.status(500).send("Error fetching user role");
        }

        const userRole = results[0]?.role;

        const cartQuery = 'SELECT * FROM cart WHERE user_id = ?';
        db.query(cartQuery, [userId], (err, cartItems) => {
            if (err) {
                console.error("Error fetching cart items:", err);
                return res.status(500).send("Error fetching cart items");
            }

            if (cartItems.length === 0) {
                return res.send(`
                    <script>
                        alert("The cart is empty!");
                        window.location.href = "/"; // Redirect to homepage
                    </script>
                `);
            }

            const totalPrice = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

            if (isWalletPayment === 'true') {
                if (userRole === 'admin') {
                    // Admin directly processes wallet payment
                    return confirmAndSaveOrder(userId, totalPrice, cartItems, res);
                } else if (userRole === 'client') {
                    // Client sends a wallet request to admin
                    const walletRequestQuery = `
                        INSERT INTO wallet_requests (user_id, total_price, status)
                        VALUES (?, ?, "pending")
                    `;
                    db.query(walletRequestQuery, [userId, totalPrice], (err) => {
                        if (err) {
                            console.error("Error saving wallet request:", err);
                            return res.status(500).send("Error saving wallet request");
                        }
                        res.send(`
                            <script>
                                alert("Wallet payment request sent to admin.");
                                window.location.href = "/orders"; // Redirect to orders page
                            </script>
                        `);
                    });
                } else {
                    // For any other role, handle accordingly (optional)
                    return res.status(403).send("Unauthorized action for this role");
                }
            } else {
                // Card payment validation
                if (!cardHolder || !cardNumber || !expMonth || !expYear || !cvc) {
                    return res.status(400).send(`
                        <script>
                            alert("Please fill out all payment details.");
                            window.location.href = "/checkout${clientId ? `?clientId=${clientId}` : ''}"; // Redirect back to checkout
                        </script>
                    `);
                }

                confirmAndSaveOrder(userId, totalPrice, cartItems, res, {
                    cardHolder, cardNumber, expMonth, expYear, cvc,
                });
            }
        });
    });
});
// Helper function to confirm and save orders
function confirmAndSaveOrder(userId, totalPrice, cartItems, res, paymentDetails = {}) {
    const insertOrderQuery = 'INSERT INTO orders (user_id, total_price, status) VALUES (?, ?, "completed")';
    db.query(insertOrderQuery, [userId, totalPrice], (err, result) => {
        if (err) {
            console.error("Error inserting order:", err);
            return res.status(500).send("Failed to create order");
        }

        const orderId = result.insertId;

        const insertOrderItemsQuery = 'INSERT INTO order_items (order_id, product_name, quantity, price) VALUES ?';
        const orderItems = cartItems.map(item => [
            orderId, item.name, item.quantity, item.price,
        ]);

        db.query(insertOrderItemsQuery, [orderItems], (err) => {
            if (err) {
                console.error("Error inserting order items:", err);
                return res.status(500).send("Failed to add items to order");
            }

            if (Object.keys(paymentDetails).length > 0) {
                // Save card payment details
                const { cardHolder, cardNumber, expMonth, expYear, cvc } = paymentDetails;
                const paymentQuery = `
                    INSERT INTO payments 
                    (card_holder, card_number, exp_month, exp_year, cvc, user_id, total) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `;
                db.query(paymentQuery, [
                    cardHolder, cardNumber, expMonth, expYear, cvc, userId, totalPrice,
                ], (err) => {
                    if (err) {
                        console.error('Payment error:', err);
                        return res.status(500).send('An error occurred while processing your payment.');
                    }
                    clearCart(userId, res);
//  313
                });
            } else {
                // Wallet payment; no card details needed
                clearCart(userId, res);
            }
        });
    });
}
// Clear cart after successful order
function clearCart(userId, res) {
    const clearCartQuery = 'DELETE FROM cart WHERE user_id = ?';
    db.query(clearCartQuery, [userId], (err) => {
        if (err) {
            console.error("Error clearing cart:", err);
            return res.status(500).send("Failed to clear cart");
        }

        res.send(`
            <script>
                alert("Order successfully placed and payment processed!");
                window.location.href = "/orders"; // Redirect to orders page
            </script>
        `);
    });
}
module.exports = router;
app.get("/orders", isAuthenticated, (req, res) => {
    const user = req.session.user;

    if (!user || !user.id) {
        return res.status(401).send(`
            <script>
                alert("Unauthorized! Please log in.");
                window.location.href = "/login";
            </script>
        `);
    }

    const userId = user.id;

    db.query(
        "SELECT id, total_price, created_at, status FROM orders WHERE user_id = ?",
        [userId],
        (err, results) => {
            if (err) {
                console.error("Error fetching orders:", err);
                return res.render("orders", {
                    user: user,
                    orders: [],
                    error: "An error occurred while fetching your orders. Please try again later." // Add error message
                });
            }

            res.render("orders", {
                user: user,
                orders: results,
                error: null // Pass null if no error occurs
            });
        }
    );
});
app.get("/orders/items", isAuthenticated, (req, res) => {
    const userId = req.session.userId; // Get user ID from session
    const orderId = req.query.orderId; // Get order ID from query parameters

    // Validate input
    if (!orderId) {
        return res.json({ success: false, message: "Order ID is required." });
    }

    // Query to fetch the order items for the given user and order
    const query = `
            SELECT oi.product_name, oi.quantity, oi.price 
            FROM order_items oi 
            INNER JOIN orders os ON oi.order_id = os.id 
            WHERE os.user_id = ? AND os.id = ?
        `;

    db.query(query, [userId, orderId], (err, results) => {
        if (err) {
            console.error("Database error occurred:", err);
            return res.json({ success: false, message: "Failed to load order items. Please try again later." });
        }

        // No items found for the given order
        if (results.length === 0) {
            return res.json({ success: false, message: "No items found for this order." });
        }

        // Successfully fetched items
        res.json({ success: true, items: results });
    });
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});