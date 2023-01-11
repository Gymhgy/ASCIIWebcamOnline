const intensities = [0,797,731,1855,2089,1983,2189,323,1205,1390,964,930,503,424,207,1066,
    2087,1323,1548,1627,1801,1753,1811,1324,2131,1858,404,809,1001,1119,993,1023,2849,1836,
    2102,1426,1840,1853,1745,1925,1788,1309,1358,1759,1320,1999,2092,1806,1574,2171,1941,1679,
    1009,1646,1582,1985,1756,1320,1699,1412,1098,1871,698,822,208,1579,1710,1170,1703,1662,1287,
    2466,1522,1240,1760,1544,1208,1758,1325,1457,1809,1802,1048,1438,1269,1324,1187,1578,1357,1631,
    1333,1464,1039,1406,723];

let asciiWebcam = {

    load: function() {
        this.source = document.getElementById("source");
        this.canvas = document.getElementById("frameCapturer");
        this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });
        this.render = document.getElementById("render");

        this.source.crossOrigin = "Anonymous";

        let width = this.source.width;
        let height = this.source.height;
        this.width = width;
        this.height = height;

        this.canvas.width = width;
        this.canvas.height = height;
        this.testCanvas = document.getElementById("test");
        this.testCanvas.width = this.width;
        this.testCanvas.height = this.height;

        this.computeFrame();

    },

    computeFrame: function() {
        this.ctx.filter = "grayscale(100%)";

        this.ctx.drawImage(this.source, 0, 0, this.width, this.height);
        let frame = this.ctx.getImageData(0, 0, this.width, this.height);



        //Do the preprocessing
        preprocessLoop:
        for(const opt of document.getElementsByClassName("option")) {
            if(opt.classList.contains("enabled")) {
                let group = opt.dataset.group;
                let name = opt.dataset.name;
                let func = processing[group][name];

                let args = [];

                for(const input of opt.getElementsByTagName("input")) {
                    if(input.value === "") continue preprocessLoop;
                    let a = Number(input.value);
                    if(isNaN(a)) continue preprocessLoop;
                    args.push(a);
                }

                func.process(frame.data, this.width, this.height, ...args);
            }
        }

        this.testCanvas.getContext("2d").putImageData(frame, 0, 0);

        const fontSize = 6;
        const height = fontSize;
        const width = fontSize / 2;

        let lines = [];
        for (let i = 0; i < this.height; i+=height) {
            let rectHeight = i + height > this.height ? this.height - i : height;
            let line = "";
            for(let j = 0; j < this.width; j+=width) {
                let rectWidth = j + width > this.width ? this.width - j : width;

                let intensity = 0;
                for (let row = i; row < i + rectHeight; row++) {
                    for (let col = j; col < j + rectWidth; col++) {
                        intensity += frame.data[(this.width * row + col) * 4];
                    }
                }        
                
                //Get index of closest value
                let min, chosenIndex = 0;
                for(let c = 0; c < intensities.length; c++) {
                    min = Math.abs(intensity - intensities[chosenIndex]);
                    if (Math.abs(intensity - intensities[c]) < min)
                        chosenIndex = c;
                }

                line += String.fromCharCode(chosenIndex + 32);
            }
            lines.push(line);
        }
        this.render.innerText = lines.join("\n");

    }
};

class ProcessFunction {
    constructor(name, arity, process) {
        this.name = name;
        this.arity = arity;
        this.process = process;
    }
}

//Assumes image is still in rgba
//All in place
let processing = {
    load: function() {
        this.processor = document.getElementById("processor");
        const categories = ["histogram", "other"];
        for(const category of categories) {
            const div = document.createElement("div");
            const funcGroup = processing[category];
            div.className = "optionGroup";

            Object.keys(funcGroup).forEach(func => {
                const option = document.createElement("div");
                option.classList.add("option");
                option.addEventListener("click", () => {
                    option.classList.toggle("enabled");
                    asciiWebcam.computeFrame();
                });
                const label = document.createElement("label");
                label.innerText = funcGroup[func].name;

                option.dataset.name = func;
                option.dataset.group = category;

                option.appendChild(label);
                for(let i = 0; i < funcGroup[func].arity; i++) {
                    const arg = document.createElement("input");
                    arg.type = "number";
                    arg.classList.add("arg");
                    arg.maxLength = 5;
                    arg.min = "0";
                    arg.max = "1000";
                    arg.addEventListener("click", e => e.stopPropagation());
                    arg.addEventListener("oninput", () => {asciiWebcam.computeFrame();console.log(2);});
                    option.appendChild(arg);
                }
                div.appendChild(option);
            });

            this.processor.appendChild(div);
        }
    },

    histogram: {
        histEqual: new ProcessFunction("Histogram Equalization", 0, function(img, width, height) {
            const total = width * height;
            //Fill with zeros
            let freq = new Array(256); for (let i=0; i<256; i++) freq[i] = 0;
            //Build frequency list
            for(let i = 0; i < total; i++) {
                freq[img[i * 4]] += 1;
            }
            let mapping = new Array(256);
            let sum = 0;
            for (let i = 0; i < 256; i++) {
                sum += freq[i];
                //cdf is sum/total
                mapping[i] = Math.round((sum / total) * 255);
            }
            for(let i = 0; i < total; i++) {
                img[i * 4 + 0] = mapping[img[i * 4 + 0]];
                img[i * 4 + 1] = mapping[img[i * 4 + 1]];
                img[i * 4 + 2] = mapping[img[i * 4 + 2]];
            }
        }),
        histStretch: new ProcessFunction("Histogram Stretching", 0, function(img, width, height) {
            const total = width * height;
            let min = 255, max = 0;
            for(let i = 0; i < total; i++) {
                if(img[i * 4] < min) min = img[i*4];
                if(img[i * 4] > max) max = img[i*4];
            }
            if(min == max) return;
            for(let i = 0; i < total; i++) {
                img[i * 4 + 0] = (img[i * 4 + 0] - min)/(max - min) * 255;
                img[i * 4 + 1] = (img[i * 4 + 1] - min)/(max - min) * 255;
                img[i * 4 + 2] = (img[i * 4 + 2] - min)/(max - min) * 255;

            }
        })
    },

    other: {
        gammaCorrect: new ProcessFunction("Gamma Correction", 1, function(img, width, height, gamma) {
            const total = width * height;
            for(let i = 0; i < total; i++) {
                img[i * 4 + 0] = 255 * (img[i * 4 + 0]/255)**gamma;
                img[i * 4 + 1] = 255 * (img[i * 4 + 1]/255)**gamma;
                img[i * 4 + 2] = 255 * (img[i * 4 + 2]/255)**gamma;
            }
        }),
        contrast: new ProcessFunction("Contrast (-255 - 255)", 1, function(img, width, height, contrast) {
            const total = width * height;
            const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
            for(let i = 0; i < total; i++) {
                img[i * 4 + 0] = factor * (img[i * 4 + 0] - 128) + 128;
                img[i * 4 + 1] = factor * (img[i * 4 + 1] - 128) + 128;
                img[i * 4 + 2] = factor * (img[i * 4 + 2] - 128) + 128;
            }
        })
    }
};

document.addEventListener("DOMContentLoaded", () => {
    processing.load();
});
var filename = "";
window.addEventListener('load', function() {
    document.getElementById("selector").addEventListener('change', function() {
        if(this.files && this.files[0]) {
            var img = document.getElementById('source');
            filename = this.files[0].name;
            img.onload = () => {
                asciiWebcam.load();
                URL.revokeObjectURL(img.src);
            }
            img.src = URL.createObjectURL(this.files[0]);
        }
    });
});

function copy() {
    const render = document.getElementById("render");
    navigator.clipboard.writeText(render.innerText).then(function() {
        console.log('Async: Copying to clipboard was successful!');
    }, function(err) {
        console.error('Async: Could not copy text: ', err);
    });
}

function save() {
    var css = `font-size: 6px; font-family: Consolas, monospace; background-color: black; color: white; justify-content: center; display: flex; line-height: 6px;`
    var code = document.getElementById("render");
    var height = code.scrollHeight;
    var width = Math.round( code.scrollWidth * 1 );
    var data =  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
                '<foreignObject width="100%" height="100%">' +
                    `<pre xmlns="http://www.w3.org/1999/xhtml" style="${css}">` +
                        code.innerHTML.replaceAll("<br>","<br></br>") + 
                    '</pre>' +
                '</foreignObject>' +
                '</svg>';
    var DOMURL = window.URL || window.webkitURL || window;
    var svg = new Blob([data], {type: 'image/svg+xml;charset=utf-8'});
    var url = DOMURL.createObjectURL(svg);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    var img = new Image();    document.body.appendChild(img);

    img.onload = function() {
        ctx.drawImage(img, 0, 0);
    }
    img.setAttribute('crossorigin', 'anonymous');

    img.src = url;

    const link = document.createElement("a");
    link.href = canvas.toDataURL();
    link.download = "ASCII - " + filename.replace(/\.[^/.]+$/, "") + ".png";
    link.click();
}

function save2() {
    const canvas = document.createElement("canvas");
    const code =  document.getElementById("render");
    const lines = code.innerText.split('\n');

    const ctx = canvas.getContext('2d', {alpha: false});
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    var height = code.scrollHeight;
    var width = Math.round( code.scrollWidth * 1 );

    canvas.width = width;
    canvas.height = height;
    const lineheight = 6;
    document.body.appendChild(canvas);

    ctx.fillStyle = 'white';
    ctx.font = '6px Consolas';
    for (var i = 0; i<lines.length; i++)
        ctx.fillText(lines[i], 0, 6 + (i*lineheight));

}

function flip() { 
    front = !front;
    asciiWebcam.load();
}