define(function(require, exports, module) {
"use strict";

var oop = require("../lib/oop");
var DocCommentHighlightRules = require("./doc_comment_highlight_rules").DocCommentHighlightRules;
var TextHighlightRules = require("./text_highlight_rules").TextHighlightRules;

var NakopadHighlightRules = function() {
    // キーワード
    var keyword = ("もし、|ならば|違えば|違えばもし|ここまで｜,｜、|。");

    // 組み込み定数
    var builtinConstants = ("対象|回数");

    var keywordMapper = this.createKeywordMapper({
        "keyword.control": keyword,
        "constant.language": builtinConstants,
    }, "identifier", true);

    // regexp must not have capturing parentheses. Use (?:) instead.
    // regexps are ordered -> the first match is used
   this.$rules = {
        "start" : [
            DocCommentHighlightRules.getStartRule("doc-start"),
            {
                token: "comment",
                regex: "(^[#＃!！]|\\s+[#＃]).*$"
            },{
                token: "comment",
                regex: "(^//|\\s+//).*$"
            },{
                token : "comment", // multi line comment
                regex : "\\/\\*",
                next : "comment"
            },{
                token : "string.start",
                regex : '"',
                push : [
                    { token: "string", regex: /\\\s*$/, next: "pop" },
                    { token: "string.end", regex: '"|$', next: "start" },
                    { defaultToken: "string"}
                ]
            },{
                token : "string.start",
                regex : "'",
                push : [
                    { token: "string", regex: /\\\s*$/, next: "pop" },
                    { token: "string.end", regex: "'|$", next: "start" },
                    { defaultToken: "string"}
                ]
            },{
                token : "string.start",
                regex : "「",
                push : [
                    { token: "string", regex: /\\\s*$/, next: "pop" },
                    { token: "string.end", regex: "」|$", next: "start" },
                    { defaultToken: "string"}
                ]
            }
        ],
        "comment" : [
            {
                token : "comment", // closing comment
                regex : "\\*\\/",
                next : "start"
            }, {
                defaultToken : "comment"
            }
        ]
    };

    this.embedRules(DocCommentHighlightRules, "doc-",
        [ DocCommentHighlightRules.getEndRule("start") ]);
    this.normalizeRules();

};

oop.inherits(NakopadHighlightRules, TextHighlightRules);

exports.NakopadHighlightRules = NakopadHighlightRules;

});
