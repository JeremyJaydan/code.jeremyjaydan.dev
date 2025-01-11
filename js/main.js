const app = (function () {
    const $defaultHTMLValue = [
        "# Welcome to code.jeremyjaydan.dev",
        "## Features: ",
        "- The HTML editor is Markdown driven",
        "- Emmet enabled for the HTML editor",
        "- Code is saved in local browser storage",
        "- Refresh after editing JavaScript to see changes",
        `<a style="display: block; margin-top: 8px;" href="https://github.com/JeremyJaydan/code.jeremyjaydan.dev" target="_blank">
          <span>View on GitHub</span>
        </a>`
    ].join("\n");

    const $defaultCSSValue = [
        "body{",
        " padding: 16px;",
        " font-family: arial;",
        "}",
    ].join("\n");

    const $storageKey = "code.jeremyjaydan.dev";
    const $storage = {
        setItem: function (key, value) {
            window.localStorage.setItem($storageKey + "_" + key, value);
        },
        getItem: function (key) {
            return window.localStorage.getItem($storageKey + "_" + key);
        },
    };

    const $markdown = new markdownit({
        highlight: function (str, lang) {
            if (lang && hljs.getLanguage(lang)) {
                try {
                    return (
                        '<pre class="hljs"><code>' +
                        hljs.highlight(lang, str, true).value +
                        "</code></pre>"
                    );
                } catch (__) {}
            }
            return (
                '<pre class="hljs"><code>' +
                $markdown.utils.escapeHtml(str) +
                "</code></pre>"
            );
        },
        html: true,
        linkify: true,
    });
    $markdown.use(markdownitIncrementalDOM, IncrementalDOM);

    const editors = [];

    Vue.component("code-mirror", {
        mounted: function () {
            this.textarea = this.$el.querySelector("textarea");
            this.mode = this.$el.dataset.mode;
            this.editor = CodeMirror.fromTextArea(this.textarea, {
                mode: { name: this.mode === "html" ? "text/html" : this.mode },
                theme: "jcdn",
                autofocus: this.$el.classList.contains("active"),
                lineNumbers: true,
                scrollbarStyle: "overlay",
                pollInterval: 10000,
                tabSize: 2,
                autoCloseBrackets: true,
                colorpicker: true,
                extraKeys: {
                    "Ctrl-K": function (cm, event) {
                        cm.state.colorpicker.popup_color_picker();
                    },
                    ...(this.mode === "html"
                        ? {
                              Tab: "emmetExpandAbbreviation",
                          }
                        : {}),
                },
            });
            this.editor.on("change", this.onChange);
            this.key = this.mode;
            editors.push(this.editor);
            this.load(this.getLocalStorage());
        },
        methods: {
            onChange: function (event) {
                const content = event.getValue();
                const $app = this.$root;
                $app[this.mode] = content;
                this.save(content);
            },
            getLocalStorage: function () {
                return $storage.getItem(this.key);
            },
            save: function (content) {
                $storage.setItem(this.key, content);
            },
            load: function (content) {
                this.editor.setValue(content || "");
            },
        },
        template: "<div class='input__editor'><textarea></textarea></div>",
    });

    const update = {
        css: function (content) {
            $doc.__css.innerHTML = content || "";
        },
        main: function (content) {
            IncrementalDOM.patch(
                $doc.__main,
                $markdown.renderToIncrementalDOM(content)
            );
        },
        script: function (content) {
            $doc.__script.innerHTML = content || "";
        },
    };

    const $app = new Vue({
        el: "#app",
        data: {
            selectedEditor: parseInt($storage.getItem("selected_editor")) || 0,
            html: $storage.getItem("html") || $defaultHTMLValue,
            css: $storage.getItem("css") || $defaultCSSValue,
            javascript: $storage.getItem("javascript"),
            editorTypes: [
                {
                    type: "html",
                    icon: "/media/html.svg",
                },
                {
                    type: "css",
                    icon: "/media/css.svg",
                },
                {
                    type: "javascript",
                    icon: "/media/javascript.svg",
                },
            ],
        },
        methods: {
            selectEditor: function (index) {
                this.selectedEditor = index;
                this.currentEditor().focus();
                $storage.setItem("selected_editor", index);
            },
            currentEditor: function () {
                return editors[this.selectedEditor];
            },
            switchEditor: function (event) {
                const key = event.key;
                if (key === "PageDown") {
                    if (this.selectedEditor < this.editorTypes.length - 1) {
                        this.selectEditor(this.selectedEditor + 1);
                    }
                } else if (key === "PageUp") {
                    if (this.selectedEditor > 0) {
                        this.selectEditor(this.selectedEditor - 1);
                    }
                }
            },
        },
        watch: {
            html: update.main,
            css: update.css,
            javascript: update.script,
        },
    });

    let $doc = {};
    (function preview(contentDocument) {
        $doc.__css = document.createElement("style");
        $doc.__main = document.createElement("main");
        $doc.__script = document.createElement("script");
        contentDocument.head.appendChild($doc.__css);
        contentDocument.body.appendChild($doc.__main);
        contentDocument.body.appendChild($doc.__script);
        update.css($app.css);
        update.main($app.html);
        update.script($app.javascript);
    })($app.$refs.codePreview.contentDocument);

    return $app;
})();
