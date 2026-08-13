async function checkAppexQuantBackend() {
    console.log("🔍 [AppexQuant Diagnostic]: Checking backend connectivity and database health...");

    // Define endpoints to test (Adjust base URL if hosted elsewhere)
    const healthEndpoints = [
        window.location.origin + "/api/health",
        window.location.origin + "/api/auth/status",
        window.location.origin + "/api/v1/ping"
    ];

    let backendFound = false;
    let diagnosticResults = {
        timestamp: new Date().toISOString(),
        siteUrl: window.location.origin,
        backendDetected: false,
        activeEndpoint: null,
        errorDetails: null
    };

    for (const endpoint of healthEndpoints) {
        try {
            const response = await fetch(endpoint, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
                cache: "no-store"
            });

            if (response.ok) {
                backendFound = true;
                diagnosticResults.backendDetected = true;
                diagnosticResults.activeEndpoint = endpoint;
                console.log(`✅ [SUCCESS]: Active backend endpoint verified at: ${endpoint}`);
                break;
            }
        } catch (err) {
            console.warn(`⚠️ [WARNING]: Endpoint unreachable: ${endpoint}`);
        }
    }

    if (!backendFound) {
        console.error("❌ [ERROR DETECTED]: No active backend server or database API detected!");
        console.error("💡 [DIAGNOSIS]: The site is currently running entirely on static local mock states. Authentication requests (Log In / Create Account) will fail or throw errors because there is no live database persistence or backend server wired up.");
        
        diagnosticResults.errorDetails = "CRITICAL: Missing backend API routes or database connection. Static preview mode active.";
        
        // Trigger visual error banner on UI for immediate awareness
        showBackendErrorBanner();
    }

    return diagnosticResults;
}

function showBackendErrorBanner() {
    if (document.getElementById("backend-error-banner")) return;

    const banner = document.createElement("div");
    banner.id = "backend-error-banner";
    banner.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: #F6465D;
        color: #FFFFFF;
        padding: 12px 24px;
        border-radius: 8px;
        font-family: monospace;
        font-size: 13px;
        font-weight: 700;
        z-index: 99999;
        box-shadow: 0 10px 25px rgba(246, 70, 93, 0.4);
        text-align: center;
        cursor: pointer;
    `;
    banner.innerHTML = `⚠️ BACKEND OFFLINE: No database or API detected. Click here to initialize production backend setup.`;
    
    banner.onclick = () => {
        alert("AppexQuant Diagnostic: To fix this, deploy your full-stack server instance with active environment variables (.env) and database bindings.");
    };

    document.body.appendChild(banner);
}

// Execute check on script load
checkAppexQuantBackend();
