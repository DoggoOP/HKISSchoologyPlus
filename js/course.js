(async function () {
    // Wait for loader.js to finish running
    while (!window.splusLoaded) {
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    await loadDependencies("course", ["all"]);
})();

let courseIdNumber;
let courseSettingsCourseName;
(function () {
    let sidebar = document.getElementById("sidebar-left");
    if (sidebar) {
        let button = createButton("splus-course-options", "Course Options");
        let img = createSvgLogo();
        Object.assign(img.style, { verticalAlign: "middle", paddingLeft: "4px", width: "18px" });
        button.prepend(img);
        button.querySelector("input").style.paddingLeft = "4px";
        button.style.cursor = "pointer";
        button.addEventListener("click", () => openModal("course-settings-modal", { courseId: document.location.href.match(/\/(\d+)\//)[1], courseName: document.querySelector(".page-title").textContent }));

        sidebar.appendChild(button);
    }
})();

(function () {
    modals.push(new Modal("course-settings-modal", "Course Options", createElement("div", [], {}, [
        createElement("div", ["splus-modal-contents"], {}, [
            createElement("div", ["setting-entry"], {}, [
                createElement("h1", ["setting-title", "splus-coursealiasing-exempt"], { id: "course-options-course-name" })
            ]),
            createElement("div", ["setting-entry"], {}, [
                createElement("h2", ["setting-title"], {}, [
                    createElement("label", ["centered-label"], { textContent: "Nickname: ", htmlFor: "setting-input-course-alias" }),
                    createElement("input", [], { type: "text", id: "setting-input-course-alias" }, [])
                ]),
                createElement("p", ["setting-description"], { textContent: "A friendlier name for a course that shows anywhere the full name for the course would normally" })
            ]),
            createElement("div", ["setting-entry"], {}, [
                createElement("h2", ["setting-title"], {}, [
                    createElement("label", ["centered-label"], { textContent: "Quick Link: ", htmlFor: "setting-input-course-quicklink" }),
                    createElement("input", [], { type: "text", id: "setting-input-course-quicklink" }, [])
                ]),
                createElement("p", ["setting-description"], { textContent: "A link associated with this class that will show up as a ⭐ button in Quick Access. Good uses of this setting might include Zoom links or class websites." })
            ]),
            createElement("div", ["setting-entry"], {}, [
                createElement("h2", [], { textContent: "Grading Scale" }),
                createElement("p", ["setting-description"], { textContent: "This grading scale is used to show letter grades when teachers don't set them, and for calculating the minimum score needed on an assignment for a grade" }),
                createElement("table", [], { id: "grading-scale-wrapper" }, [
                    createElement("tr", [], {}, [
                        createElement("th", [], { textContent: "Minimum Percentage" }),
                        createElement("th", [], { textContent: "Grade Symbol" })
                    ])
                ]),
                createElement("p", ["add-grade-symbol"], {}, [
                    createElement("a", [], { textContent: "+ Add Grading Symbol", href: "#", onclick: (event) => createRow() })
                ]),
                createElement("p", ["add-grade-symbol"], {}, [
                    createElement("a", [], { textContent: "> Set as default grading scale for all courses", href: "#", onclick: setDefaultScale })
                ])
            ]),
            createElement("div", ["setting-entry"], {}, [
                createElement("h2", ["setting-title"], { textContent: "Force Default Icon: " }, [
                    createElement("select", [], { id: "force-default-icon-splus-courseopt-select" }, [
                        createElement("option", [], { textContent: "Enabled", value: "enabled" }),
                        createElement("option", [], { textContent: "Disabled", value: "disabled", selected: true })
                    ])
                ]),
                createElement("p", ["setting-description"], { textContent: "Use Schoology's icon for this course instead of the Schoology Plus themed icon regardless of the global Schoology Plus setting" })
            ])
        ]),
        createElement("div", ["settings-buttons-wrapper"], undefined, [
            createButton("save-course-settings", "Save Settings", () => saveCourseSettings()),
            createElement("div", ["settings-actions-wrapper"], {}, [
                createElement("a", ["restore-defaults"], { textContent: "Restore Defaults", onclick: restoreCourseDefaults, href: "#" })
            ]),
        ])
    ]), modalFooterText, setCourseOptionsContent));
})();

document.querySelector("#course-settings-modal .close").onclick = modalClose;

const defaultGradingScale = Setting.getValue("getGradingScale")(null);
let gradingScale = defaultGradingScale;

function setCourseOptionsContent(modal, options) {
    document.getElementById("course-options-course-name").textContent = options.courseName || "<UNKNOWN COURSE>";
    courseSettingsCourseName = options.courseName;
    courseIdNumber = options.courseId ? options.courseId : courseIdNumber;

    for (let e of document.querySelectorAll(".grade-symbol-row")) {
        e.parentElement.removeChild(e);
    }
    gradingScale = Setting.getNestedValue("gradingScales", courseIdNumber, gradingScale);

    for (let p of Object.keys(gradingScale).sort((a, b) => a - b).reverse()) {
        createRow(p, gradingScale[p]);
    }

    let aliasInput = document.getElementById("setting-input-course-alias");
    let alias = Setting.getNestedValue("courseAliases", courseIdNumber);
    if (alias) {
        aliasInput.value = alias;
    } else {
        aliasInput.value = "";
    }

    let quickLinkInput = document.getElementById("setting-input-course-quicklink");
    quickLinkInput.value = Setting.getNestedValue("courseQuickLinks", courseIdNumber, "");

    let courseIconOverride = Setting.getValue("forceDefaultCourseIcons");
    if (courseIconOverride) {
        courseIconOverride = courseIconOverride[courseIdNumber];
    }
    if (courseIconOverride) {
        for (let opt of document.getElementById("force-default-icon-splus-courseopt-select").children) {
            if (opt.value == courseIconOverride) {
                opt.selected = true;
            }
        }
    }

    (document.getElementById("request-course-icon-wrapper") || {}).outerHTML = "";

    if (isLAUSD()) {
        let iconExists = Theme.hasBuiltInIcon(options.courseName);
        modal.element.querySelector(".splus-modal-contents").appendChild(
            createElement("div", ["setting-entry"], { id: "request-course-icon-wrapper" }, [
                createElement("h2", ["setting-title"], { textContent: iconExists ? "Report Incorrect Icon: " : "Request Icon: " }, [
                    createElement("a", ["splus-track-clicks"], { id: "request-course-icon-link", textContent: iconExists ? "Click here to report that the icon for this course is not correct" : "Click here to request a built-in icon for this course", href: `${ICON_REQUEST_URL}${options.courseName}(WRONG ICON!!!)`, target: "_blank" })
                ]),
                createElement("p", ["setting-description"], { textContent: iconExists ? "Request that Schoology Plus change the built-in course icon for this course" : "Request that Schoology Plus adds a built-in course icon for this course" })
            ])
        );
    }
}

function createRow(percentage, symbol) {
    let gradingScaleWrapper = document.getElementById("grading-scale-wrapper");
    let row = createElement("tr", ["grade-symbol-row"], {}, [
        createElement("td", [], {}, [
            createElement("input", [], { type: "text", value: percentage || "" })
        ]),
        createElement("td", [], {}, [
            createElement("input", [], { type: "text", value: symbol || "" })
        ]),
        createElement("td", [], {}, [
            createElement("a", ["close-button"], { textContent: "×", href: "#", title: "Delete Grade Symbol", onclick: (event) => event.target.parentElement.parentElement.outerHTML = "" })
        ])
    ]);
    gradingScaleWrapper.appendChild(row);
}

function getCreatedGradingScale() {
    let scale = {};
    for (let r of document.querySelectorAll(".grade-symbol-row")) {
        let inputBoxes = r.querySelectorAll("input");
        if (inputBoxes[0].value && inputBoxes[1].value) {
            scale[inputBoxes[0].value] = inputBoxes[1].value;
        } else {
            alert("Values cannot be empty!");
            return null;
        }
    }

    return scale;
}

function saveCourseSettings(skipSavingGradingScale = false) {
    let currentValue = Setting.getValue("gradingScales", {});

    if (!skipSavingGradingScale) {
        let scale = getCreatedGradingScale();

        if (scale === null) {
            alert("Values cannot be empty!");
            return;
        }

        const shallowCompare = (obj1, obj2) =>
            Object.keys(obj1).length === Object.keys(obj2).length &&
            Object.keys(obj1).every(key =>
                obj2.hasOwnProperty(key) && obj1[key] === obj2[key]
            );

        if (!currentValue[courseIdNumber] || !shallowCompare(scale, currentValue[courseIdNumber])) {
            trackEvent("update_setting", {
                id: "gradingScales",
                context: "Course Settings",
                legacyTarget: "gradingScales",
                legacyAction: "set value",
                legacyLabel: "Course Settings"
            });
        }

        currentValue[courseIdNumber] = scale;
    }

    let currentAliasesValue = Setting.getValue("courseAliases", {});
    let newAliasValue = document.getElementById("setting-input-course-alias").value;
    if (newAliasValue !== currentAliasesValue[courseIdNumber]) {
        trackEvent("update_setting", {
            id: "courseAliases",
            context: "Course Settings",
            legacyTarget: "courseAliases",
            legacyAction: "set value",
            legacyLabel: "Course Settings"
        });
    }
    currentAliasesValue[courseIdNumber] = newAliasValue;

    let currentQuickLinkValue = Setting.getNestedValue("courseQuickLinks", courseIdNumber);
    let newQuickLinkValue = document.getElementById("setting-input-course-quicklink").value;
    if (newQuickLinkValue !== currentQuickLinkValue) {
        trackEvent("update_setting", {
            id: "courseQuickLinks",
            context: "Course Settings",
            legacyTarget: "courseQuickLinks",
            legacyAction: "set value",
            legacyLabel: "Course Settings"
        });
    }
    Setting.setNestedValue("courseQuickLinks", courseIdNumber, newQuickLinkValue);

    let courseIconOverride = Setting.getValue("forceDefaultCourseIcons", {});
    let iconOverrideSelect = document.getElementById("force-default-icon-splus-courseopt-select");
    let overrideValue = iconOverrideSelect.options[iconOverrideSelect.selectedIndex].value;
    if (overrideValue !== courseIconOverride[courseIdNumber]) {
        trackEvent("update_setting", {
            id: "forceDefaultCourseIcons",
            context: "Course Settings",
            value: overrideValue,
            legacyTarget: "forceDefaultCourseIcons",
            legacyAction: `set value: ${overrideValue}`,
            legacyLabel: "Course Settings"
        });
    }
    courseIconOverride[courseIdNumber] = overrideValue

    Setting.setValues({ gradingScales: currentValue, courseAliases: currentAliasesValue, forceDefaultCourseIcons: courseIconOverride }, () => {
        let settingsSaved = document.getElementById("save-course-settings");
        settingsSaved.value = "Saved!";
        setTimeout(() => {
            location.reload();
        }, 1000);
    });
}

function setDefaultScale() {
    let scale = getCreatedGradingScale();

    if (scale === null) {
        alert("Values cannot be empty!");
        return;
    }

    if (confirm("Are you sure you want to set this as your default grading scale?\n\nThis will replace the grading scale for all courses except for those where you have already defined custom grading scales.\n\nThis will also save your course settings and reload the page.")) {
        Setting.setValue("defaultGradingScale", scale, () => saveCourseSettings(true));
    }
}

function restoreCourseDefaults() {
    trackEvent("reset_settings", {
        context: "Course Settings",
        legacyTarget: "restore-course-defaults",
        legacyAction: "restore default values",
        legacyLabel: "Course Settings"
    });
    let currentValue = Setting.getValue("gradingScales", {});
    delete currentValue[courseIdNumber];

    let currentAliasesValue = Setting.getValue("courseAliases", {});
    delete currentAliasesValue[courseIdNumber];

    let courseIconOverride = Setting.getValue("forceDefaultCourseIcons", {});
    delete courseIconOverride[courseIdNumber];

    let courseQuickLinks = Setting.getValue("courseQuickLinks", {});
    delete courseQuickLinks[courseIdNumber];

    if (confirm(`Are you sure you want to reset all options for the course "${courseSettingsCourseName}" to their default values? This action is irreversible.`)) {
        Setting.setValues({ gradingScales: currentValue, courseAliases: currentAliasesValue, forceDefaultCourseIcons: courseIconOverride, courseQuickLinks: courseQuickLinks }, () => {
            alert("Settings restored. Reloading.");
            location.reload();
        });
    }
}

Logger.debug("Finished loading course.js");