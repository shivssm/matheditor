const Mathml2asciimath = require('mathml2asciimath');
const MathMl2LaTeX = require('mathml2latex');

window.output2 = function() {
    document.getElementById("latex").value = MathMl2LaTeX.convert(document.getElementById("mathml").value);
}

window.output3 = function() {
    document.getElementById("asciimath").value = new Mathml2asciimath(document.getElementById("mathml").value).convert();
}

window.mathmlCopy = function() {
    var copyText = document.getElementById("mathml");

    copyText.select();
    copyText.setSelectionRange(0, 99999);

    document.execCommand("copy");
}

window.asciimathCopy = function() {
    var copyText = document.getElementById("asciimath");

    copyText.select();
    copyText.setSelectionRange(0, 99999);

    document.execCommand("copy");
}

window.latexCopy = function() {
    var copyText = document.getElementById("latex");

    copyText.select();
    copyText.setSelectionRange(0, 99999);

    document.execCommand("copy");
}