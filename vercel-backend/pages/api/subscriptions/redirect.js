// API endpoint for handling Stripe checkout redirects
export default async function handler(req, res) {
    // Get status and session ID from query parameters
    const { status, session_id } = req.query;

    // Create HTML response based on status
    let html;

    if (status === 'success') {
        html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Subscription Successful</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 40px 20px;
                        text-align: center;
                        line-height: 1.6;
                    }
                    h1 {
                        color: #4CAF50;
                        margin-bottom: 20px;
                    }
                    p {
                        margin-bottom: 20px;
                    }
                    .icon {
                        font-size: 64px;
                        margin-bottom: 20px;
                    }
                    .close-button {
                        display: inline-block;
                        background-color: #4CAF50;
                        color: white;
                        padding: 10px 20px;
                        border-radius: 4px;
                        text-decoration: none;
                        margin-top: 20px;
                    }
                </style>
            </head>
            <body>
                <div class="icon">✅</div>
                <h1>Subscription Successful!</h1>
                <p>Thank you for subscribing to the Pro plan. Your subscription is now active.</p>
                <p>You can now return to the extension and enjoy all the Pro features.</p>
                <p><small>Session ID: ${session_id}</small></p>
                <a href="#" class="close-button" onclick="window.close()">Close this window</a>
                <script>
                    // Close window automatically after 5 seconds
                    setTimeout(() => {
                        window.close();
                    }, 5000);
                </script>
            </body>
            </html>
        `;
    } else if (status === 'canceled') {
        html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Subscription Canceled</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 40px 20px;
                        text-align: center;
                        line-height: 1.6;
                    }
                    h1 {
                        color: #F44336;
                        margin-bottom: 20px;
                    }
                    p {
                        margin-bottom: 20px;
                    }
                    .icon {
                        font-size: 64px;
                        margin-bottom: 20px;
                    }
                    .close-button {
                        display: inline-block;
                        background-color: #F44336;
                        color: white;
                        padding: 10px 20px;
                        border-radius: 4px;
                        text-decoration: none;
                        margin-top: 20px;
                    }
                </style>
            </head>
            <body>
                <div class="icon">❌</div>
                <h1>Subscription Canceled</h1>
                <p>You have canceled the subscription process. No charges have been made.</p>
                <p>You can still use the extension with the trial features.</p>
                <p><small>Session ID: ${session_id}</small></p>
                <a href="#" class="close-button" onclick="window.close()">Close this window</a>
                <script>
                    // Close window automatically after 5 seconds
                    setTimeout(() => {
                        window.close();
                    }, 5000);
                </script>
            </body>
            </html>
        `;
    } else {
        html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Invalid Status</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 40px 20px;
                        text-align: center;
                        line-height: 1.6;
                    }
                    h1 {
                        color: #FF9800;
                        margin-bottom: 20px;
                    }
                    p {
                        margin-bottom: 20px;
                    }
                    .icon {
                        font-size: 64px;
                        margin-bottom: 20px;
                    }
                    .close-button {
                        display: inline-block;
                        background-color: #FF9800;
                        color: white;
                        padding: 10px 20px;
                        border-radius: 4px;
                        text-decoration: none;
                        margin-top: 20px;
                    }
                </style>
            </head>
            <body>
                <div class="icon">⚠️</div>
                <h1>Invalid Status</h1>
                <p>An invalid status was provided. Please return to the extension.</p>
                <p><small>Status: ${status || 'none'}, Session ID: ${session_id || 'none'}</small></p>
                <a href="#" class="close-button" onclick="window.close()">Close this window</a>
                <script>
                    // Close window automatically after 5 seconds
                    setTimeout(() => {
                        window.close();
                    }, 5000);
                </script>
            </body>
            </html>
        `;
    }

    // Set content type and send HTML response
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
}