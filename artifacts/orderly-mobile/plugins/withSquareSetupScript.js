// Import via `expo/config-plugins` (re-export) so it resolves reliably under
// pnpm, where the transitive `@expo/config-plugins` may not be hoisted.
const { withXcodeProject, withDangerousMod } = require("expo/config-plugins");
const fs = require("node:fs");
const path = require("node:path");

/**
 * Square In-App Payments SDK ships its .framework bundles with a nested
 * `Frameworks/` directory (e.g. ThreeDS_SDK.framework, CorePaymentCard.framework)
 * and an unsigned `setup` helper script. App Store validation rejects those:
 *   ITMS-90205 / ITMS-90206 — disallowed nested bundles / disallowed file 'Frameworks'
 *   ITMS-90035            — SquareInAppPaymentsSDK.framework/setup not signed
 *
 * Square's official fix is a Run Script build phase that runs each framework's
 * `setup` script; that script un-nests the frameworks, re-signs them, and then
 * deletes itself. It MUST run AFTER "[CP] Embed Pods Frameworks", because the
 * frameworks only exist in the .app bundle once that phase has copied them.
 *
 * Two steps are required:
 *  1) withXcodeProject: add the Run Script phase to the app target (prebuild).
 *  2) withDangerousMod:  inject Podfile `post_install` ruby that MOVES that phase
 *     to the very end of the app target's build phases. This is necessary because
 *     `pod install` runs AFTER prebuild and appends "[CP] Embed Pods Frameworks"
 *     *after* our phase, so without reordering our phase runs too early (it then
 *     reports "already clean" and does nothing).
 */
const PHASE_NAME = "Square SDK setup (un-nest frameworks)";
const REORDER_MARKER = "square-setup-reorder";

const shellScript = [
  "# Auto-added by plugins/withSquareSetupScript.js — do not edit in prebuild output.",
  "# Runs Square SDK setup so nested frameworks are un-nested and the unsigned",
  "# 'setup' helper deletes itself (fixes App Store ITMS-90205/90206/90035).",
  "# Must run AFTER [CP] Embed Pods Frameworks (reordered via Podfile post_install).",
  "for FW in SquareInAppPaymentsSDK SquareBuyerVerificationSDK; do",
  '  SETUP="${BUILT_PRODUCTS_DIR}/${FRAMEWORKS_FOLDER_PATH}/${FW}.framework/setup"',
  '  if [ -f "$SETUP" ]; then',
  '    echo "[square-setup] running setup for ${FW}"',
  '    "$SETUP"',
  "  else",
  '    echo "[square-setup] no setup script for ${FW} (already clean)"',
  "  fi",
  "done",
].join("\n");

function withSquareSetupBuildPhase(config) {
  return withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;

    const phases = project.hash.project.objects.PBXShellScriptBuildPhase || {};
    const exists = Object.values(phases).some(
      (p) =>
        p &&
        typeof p === "object" &&
        typeof p.name === "string" &&
        p.name.replace(/"/g, "").includes(PHASE_NAME),
    );

    if (!exists) {
      const target = project.getFirstTarget().uuid;
      project.addBuildPhase([], "PBXShellScriptBuildPhase", PHASE_NAME, target, {
        shellPath: "/bin/sh",
        shellScript,
      });
    }

    return cfg;
  });
}

const reorderRuby = `
    # >>> ${REORDER_MARKER}: move the Square setup Run Script phase to the very
    # end of the app target's build phases so it runs AFTER [CP] Embed Pods
    # Frameworks. Without this the framework 'setup' cannot un-nest the embedded
    # frameworks and App Store rejects with ITMS-90205/90206/90035.
    saved_projects = []
    installer.aggregate_targets.each do |aggregate_target|
      user_project = aggregate_target.user_project
      next if user_project.nil?
      moved = false
      user_project.native_targets.each do |t|
        phase = t.shell_script_build_phases.find { |p| p.name == '${PHASE_NAME}' }
        next if phase.nil?
        t.build_phases.delete(phase)
        t.build_phases << phase
        moved = true
      end
      if moved && !saved_projects.include?(user_project.path.to_s)
        user_project.save
        saved_projects << user_project.path.to_s
      end
    end
    # <<< ${REORDER_MARKER}
`;

function withSquareSetupReorder(config) {
  return withDangerousMod(config, [
    "ios",
    (cfg) => {
      const podfilePath = path.join(
        cfg.modRequest.platformProjectRoot,
        "Podfile",
      );
      let contents = fs.readFileSync(podfilePath, "utf8");

      if (!contents.includes(REORDER_MARKER)) {
        const re = /post_install do \|installer\|[^\n]*\n/;
        if (re.test(contents)) {
          contents = contents.replace(re, (m) => `${m}${reorderRuby}`);
        } else {
          // No existing post_install block — add a standalone one.
          contents += `\npost_install do |installer|\n${reorderRuby}\nend\n`;
        }
        fs.writeFileSync(podfilePath, contents, "utf8");
      }

      return cfg;
    },
  ]);
}

module.exports = function withSquareSetupScript(config) {
  config = withSquareSetupBuildPhase(config);
  config = withSquareSetupReorder(config);
  return config;
};
