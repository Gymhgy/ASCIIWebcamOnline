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
        });
        this.video.addEventListener("play", () => this.timerCallback(), false);
    },

    computeFrame: function() {
        this.ctx.filter = "grayscale(100%)";

        this.ctx.drawImage(this.video, 0, 0, this.width, this.height);
        let frame = this.ctx.getImageData(0, 0, this.width, this.height);

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

let processing = {

};


document.addEventListener("DOMContentLoaded", () => {
    asciiWebcam.load();
});