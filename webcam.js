const intensities = [0,797,731,1855,2089,1983,2189,323,1205,1390,964,930,503,424,207,1066,
    2087,1323,1548,1627,1801,1753,1811,1324,2131,1858,404,809,1001,1119,993,1023,2849,1836,
    2102,1426,1840,1853,1745,1925,1788,1309,1358,1759,1320,1999,2092,1806,1574,2171,1941,1679,
    1009,1646,1582,1985,1756,1320,1699,1412,1098,1871,698,822,208,1579,1710,1170,1703,1662,1287,
    2466,1522,1240,1760,1544,1208,1758,1325,1457,1809,1802,1048,1438,1269,1324,1187,1578,1357,1631,
    1333,1464,1039,1406,723];

let asciiWebcam = {

    timerCallback: function() {
        if (this.video.paused || this.video.ended) {
            return;
        }
        this.computeFrame();
        setTimeout(() => this.timerCallback(), 0);
    },

    load: function() {
        this.video = document.getElementById("videoFeed");
        this.canvas = document.getElementById("frameCapturer");
        this.ctx = this.canvas.getContext("2d");
        this.render = document.getElementById("render");

        navigator.mediaDevices.getUserMedia({video: true}).then(stream => {
            let {width, height} = stream.getTracks()[0].getSettings();
            this.width = width;
            this.height = height;

            this.video.srcObject = stream;
            this.video.width = width;
            this.video.height = height;

            this.canvas.width = width;
            this.canvas.height = height;
            this.testCanvas = document.createElement("canvas");
            this.testCanvas.width = this.width;
            this.testCanvas.height = this.height;
            this.video.parentElement.appendChild(this.testCanvas);

        });
        this.video.addEventListener("play", () => this.timerCallback(), false);


    },

    computeFrame: function() {
        this.ctx.filter = "grayscale(100%)";

        this.ctx.drawImage(this.video, 0, 0, this.width, this.height);
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
        })
    }
};

document.addEventListener("DOMContentLoaded", () => {
    asciiWebcam.load();
    processing.load();
});

//Buttons
function playPause() {
    const video = document.getElementById("videoFeed");
    if(video.toggleAttribute("data-paused")) {
        video.pause();
    }
    else {
        video.play();
    }
}
function copy() {
    const render = document.getElementById("render");
    navigator.clipboard.writeText(render.innerText).then(function() {
        console.log('Async: Copying to clipboard was successful!');
    }, function(err) {
        console.error('Async: Could not copy text: ', err);
    });
}