const fs = require('fs');
let code = fs.readFileSync('src/services/failSafeEngineService.ts', 'utf8');

// Replace synchronous access with dynamic import in triggerFailSafe
code = code.replace(
/      if \(typeof automationControlService !== 'undefined' && automationControlService\) \{\n        if \(meta.action === 'EMERGENCY_HALT'\) \{\n          automationControlService.emergencyHaltAutomation\(incident.reason\);\n        \} else \{\n          automationControlService.pauseAutomation\(incident.reason\);\n        \}\n      \}/,
`      import('./automationControlService').then(({ automationControlService }) => {
        if (meta.action === 'EMERGENCY_HALT') {
          automationControlService.emergencyHaltAutomation(incident.reason);
        } else {
          automationControlService.pauseAutomation(incident.reason);
        }
      }).catch(() => {});`
);

// Replace synchronous access with dynamic import in resetFailSafe
code = code.replace(
/      if \(typeof automationControlService !== 'undefined' && automationControlService\) \{\n        automationControlService.resumeAutomation\(\);\n      \}/,
`      import('./automationControlService').then(({ automationControlService }) => {
        automationControlService.resumeAutomation();
      }).catch(() => {});`
);

fs.writeFileSync('src/services/failSafeEngineService.ts', code);
