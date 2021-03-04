var loadFun = function () {
  function getReal(src) {
    return new Promise(function (resolve, reject) {
      axios
        .get(src)
        .then(function (response) {
          return response.data.value;
        })
        .then(function (values) {
          var data = {};
          values.forEach(function (el) {
            var realData = [];
            for (let i = 0; i < el.value.length; i++) {
              var value = el.value[i];
              //realData.push([value.par, value.val, value.unit]);
              realData.push(value);
            }
            //realData.push(["時間", el.dateTime, ""]);
            data[el.stid] = { vals: realData, dateTime: el.dateTime };
          });
          resolve(data);
        });
    });
  }
  function getHour(src) {
    return new Promise(function (resolve, reject) {
      axios
        .get(src)
        .then(function (response) {
          return response.data.stidInfo;
        })
        .then(function (values) {
          var data = {};
          values.forEach(function (el) {
            var valInfo = [];
            for (let i = 0; i < el.par.length; i++) {
              var value = [];
              var parVal = el.par[i];
              for (let j = 0; j < parVal.valueInfo.length; j++) {
                var valueInfo = parVal.valueInfo[j];
                value[j] = {
                  x: Date.UTC(valueInfo.yyyy, valueInfo.mon, valueInfo.day, valueInfo.hh, valueInfo.mm, 0, 0),
                  y: valueInfo.val,
                };
              }
              valInfo[i] = {
                name: parVal.par,
                type: "line",
                data: value,
                marker: {
                  enabled: false,
                },
                /*zones: [
                  {
                    value: 2,
                    color: "#f7a35c",
                    dashStyle: "dot",
                  },
                  {
                    value: 30,
                    color: "#7cb5ec",
                  },
                  {
                    color: "#90ed7d",
                  },
                ],*/
                /*zoneAxis: "x",
                zones: [
                  {
                    value: value[7].x,
                  },
                  {
                    dashStyle: "longdash",
                  },
                ],*/
              };
            }
            data[el.stid] = valInfo;
          });
          resolve(data);
        });
    });
  }
  function calcComfort01(temperature, relativeHumidity, windSpeed) {
    //人體舒適度指數
    if (windSpeed == undefined) {
      windSpeed = 3;
    }
    return parseFloat(((1.818 * temperature + 18.18) * (0.88 + 0.002 * relativeHumidity) + (temperature - 32) / (45 - temperature) - 3.2 * windSpeed + 18.2).toFixed(2));
  }
  function calcComfort02(temperature, relativeHumidity, windSpeed) {
    //溫室指數
    var f = relativeHumidity / 100;
    var T = (temperature * 9) / 5 + 32;
    return T - (0.55 - 0.55 * f) * (T - 58);
  }
  function calcComfort(temperature, relativeHumidity, windSpeed) {
    return calcComfort01(temperature, relativeHumidity, windSpeed);
  }

  var aqi_map = [0, 50, 100, 150, 200, 300, 400, 500];
  var aqi = {
    "PM2.5": [0, 15.4, 35.4, 54.4, 150.4, 250.4, 350.4, 500.4],
    PM10: [0, 54, 125, 254, 354, 424, 504, 604],
  };
  //AQI範圍對應

  function getAQI(type, val) {
    var list = aqi[type];
    var len = list.length;
    var index = list.findIndex(function (el) {
      return val <= el;
    });
    var startIndex = 0;
    var endIndex = 0;
    var rate = 0;
    if (index == -1) {
      startIndex = len - 1;
      endIndex = len - 1;
      rate = 0;
    } else {
      startIndex = Math.max(index - 1, 0);
      endIndex = index;
      rate = Float.inverseMix(list[startIndex], list[endIndex], val);
    }
    return { startIndex: startIndex, endIndex: endIndex, val: Float.mix(aqi_map[startIndex], aqi_map[endIndex], rate) };
  }

  Vue.use(VSwitch);
  Vue.use(HighchartsVue.default);
  Vue.component("box-component", {
    template: "#box-component",
    components: {
      highcharts: HighchartsVue.Chart,
    },
    props: {
      title: {
        type: String,
        default: "",
      },
      list: {
        type: Array,
        default: function () {
          return [];
        },
      },
      realData: {
        type: Object,
        default: function () {
          return {};
        },
      },
      hourData: {
        type: Object,
        default: function () {
          return {};
        },
      },
    },
    data: function () {
      return {
        currentIndex: 0,
        whereText: "",
        dataShow: [],
        dataDateTime: "",
        chartOptions: {
          title: {
            text: "近24小時測值趨勢",
            align: "center",
            style: {
              color: "white",
              fontFamily: "Microsoft JhengHei",
            },
          },
          chart: {
            type: "column",
            /*zoomType: "x",*/
            height: 150,
            backgroundColor: "rgba(0, 0, 0, 0)",
          },
          responsive: {
            rules: [
              {
                condition: {
                  maxWidth: 500,
                },
                chartOptions: {
                  title: {
                    style: {
                      fontSize: "12px",
                    },
                  },
                  chart: {
                    height: 150,
                  },
                  legend: {
                    enabled: false,
                  },
                },
              },
            ],
          },
          scrollbar: { enabled: false },
          navigator: { enabled: false },
          credits: { enabled: false },
          xAxis: {
            type: "datetime",
            labels: {
              style: {
                color: "white",
                fontFamily: "Microsoft JhengHei",
              },
            },
          },
          yAxis: {
            title: {
              text: null,
            },
            type: "number",
            labels: {
              style: {
                color: "white",
                fontFamily: "Microsoft JhengHei",
              },
            },
            opposite: false,
          },
          legend: {
            enabled: true,
            align: "right",
            verticalAlign: "middle",
            layout: "vertical",
            itemStyle: {
              color: "white",
            },
          },
          plotOptions: { series: { turboThreshold: 50000 } },
          rangeSelector: { enabled: false },
          tooltip: {
            shared: true,
          },
          series: [],
        },
      };
    },
    mounted: function () {
      this.updateData(this.list[this.currentIndex]);
      var self = this;
      setInterval(function () {
        self.currentIndex++;
        self.currentIndex %= self.list.length;
      }, 60000);
    },
    watch: {
      realData: function (val) {
        this.updateRealData(this.list[this.currentIndex]);
      },
      hourData: function (val) {
        this.updateHourData(this.list[this.currentIndex]);
      },
      currentIndex: function (val) {
        this.updateData(this.list[this.currentIndex]);
      },
    },
    methods: {
      point_click: function (index, item) {
        this.currentIndex = index;
        this.whereText = item.text;
        var id = item.id;
        this.dataShow = this.realData[id].vals;
        this.dataDateTime = this.realData[id].dateTime;
        this.chartOptions.series = this.hourData[id];
      },
      updateRealData: function (obj) {
        if (obj && this.realData[obj.id]) {
          this.dataShow = this.realData[obj.id].vals;
          this.dataDateTime = this.realData[obj.id].dateTime;

          //console.log(this.dataShow, this.calcComfort);
        }
      },
      updateHourData: function (obj) {
        if (obj && this.hourData[obj.id]) {
          this.chartOptions.series = this.hourData[obj.id];
        }
      },
      updateData: function (obj) {
        if (obj) {
          this.whereText = obj.text;
        }
        this.updateRealData(obj);
        this.updateHourData(obj);
      },
      classToObject: function (str) {
        if (str) {
          var list = str.split(" ");
          var obj = {};
          list.forEach(function (el) {
            obj[el] = true;
          });
          return obj;
        }
      },
    },
    computed: {
      id: function () {
        return this.list[this.currentIndex].id;
      },
    },
  });
  var vue = new Vue({
    el: "#app",
    data: function () {
      return {
        realData: {},
        hourData: {},
        aqiData: {},
        airData: {
          title: "室外空品",
          list: [
            { id: "TJ00101", text: "U棟3樓", pos: ["40%", "73%"] },
            { id: "TJ00102", text: "J棟1樓", pos: ["65%", "63%"] },
            { id: "TJ00103", text: "A棟3樓", pos: ["18%", "64%"] },
            { id: "TJ00104", text: "S棟2樓", pos: ["52%", "22%"] },
            { id: "TJ00105", text: "G棟1樓", pos: ["35%", "62%"] },
            { id: "NPL10501", text: "S棟2樓", pos: ["49%", "24%"], class: "inside" },
          ],
        },
        waterData: {
          title: "水質",
          list: [
            { id: "TJ00201", text: "F棟1樓", pos: ["44%", "58%"] },
            { id: "TJ00202", text: "U棟6樓", pos: ["29%", "75%"] },
            { id: "TJ00203", text: "H棟1樓", pos: ["33%", "56%"] },
            { id: "TJ00204", text: "R棟1樓", pos: ["39%", "30%"] },
            { id: "TJ00205", text: "G棟1樓", pos: ["37%", "62%"] },
          ],
        },
        noiseData: {
          title: "噪音",
          list: [
            { id: "TJ00301", text: "U棟3樓", pos: ["40%", "76%"] },
            { id: "TJ00302", text: "J棟1樓", pos: ["69%", "65%"] },
            { id: "TJ00303", text: "A棟3樓", pos: ["19%", "64%"] },
            { id: "TJ00304", text: "S棟2樓", pos: ["52%", "24%"] },
            { id: "TJ00305", text: "G棟1樓", pos: ["37%", "62%"] },
          ],
        },
        eleData: {
          title: "飲水機電力",
          list: [
            { id: "TJ00401", text: "F棟1樓", pos: ["44%", "58%"] },
            { id: "TJ00402", text: "U棟6樓", pos: ["29%", "75%"] },
            { id: "TJ00403", text: "H棟1樓", pos: ["33%", "56%"] },
            { id: "TJ00404", text: "R棟1樓", pos: ["39%", "30%"] },
            { id: "TJ00405", text: "G棟1樓", pos: ["37%", "62%"] },
          ],
        },
        videoShow: false,
        videoPlayPromise: null,
        videoTimeID: null,
        qrShow: false,
      };
    },
    watch: {
      videoShow: function (val) {
        var video = this.$refs.video;
        if (val) {
          this.videoPlayPromise = video.play();
        } else {
          if (this.videoPlayPromise) {
            this.videoPlayPromise.then(function () {
              video.pause();
            });
          }
        }
      },
    },
    mounted: function () {
      this.updateData();
      var self = this;
      setInterval(function () {
        self.updateData();
      }, 60000);
      this.resetVideoTimeID();
    },
    methods: {
      app_mousemove: function () {
        if (!this.videoShow) {
          this.resetVideoTimeID();
        }
      },
      video_closeBtn_click: function () {
        this.videoShow = false;
        this.resetVideoTimeID();
      },
      qrImg_click: function () {
        this.qrShow = true;
      },
      qr_closeBtn_click: function () {
        this.qrShow = false;
      },
      resetVideoTimeID: function () {
        clearTimeout(this.videoTimeID);
        var self = this;
        this.videoTimeID = setTimeout(function () {
          self.videoShow = true;
        }, 180000);
      },
      updateData: function () {
        var self = this;
        getReal("https://www.jsene.com/demo/tjapi/getvalue/tajengetvalue/real").then(function (data) {
          self.realData = data;
        });
        getHour("https://www.jsene.com/demo/tjapi/getvalue/tajengetvalue/hour?st=").then(function (data) {
          self.airData.list.forEach((el) => {
            var id = el.id;
            var value = [];
            var len = data[id][0].data.length;
            for (var i = 0; i < len; i++) {
              var temperature = data[id][0].data[i];
              var relativeHumidity = data[id][1].data[i];
              value[i] = { x: temperature.x, y: calcComfort(temperature.y, relativeHumidity.y) };
            }
            data[id].unshift({
              name: "舒適度",
              type: "line",
              data: value,
              marker: {
                enabled: false,
              },
            });
          });
          //舒適度補充計算
          var aqiData = {};
          self.airData.list.forEach((el, i) => {
            var id = el.id;
            var obj = {};
            data[id].forEach(function (el) {
              var temp = -Infinity;
              if (el.name.search(/\b(PM2.5|PM10)\b/) != -1) {
                var d = el.data.slice(0, 8).map(function (el) {
                  return el.y;
                });
                var s = d.reduce(function (p, c) {
                  return p + c;
                }, 0);
                var a = s / d.length;
                var aqi = getAQI(el.name, a);
                obj[el.name] = { val: a, aqi: aqi };
                if (aqi.val > temp) {
                  obj["aqimax"] = el.name;
                }
              }
            });
            aqiData[id] = obj;
          });
          self.aqiData = aqiData;
          //計算前八小時AQI

          self.hourData = data;
        });
      },
      calcComfort: function (temperature, relativeHumidity, windSpeed) {
        if (temperature && relativeHumidity && windSpeed) {
          var temperature_val = temperature.val;
          var relativeHumidity_val = relativeHumidity.val;
          var windSpeed_val = windSpeed.val;
          return calcComfort(temperature_val, relativeHumidity_val, windSpeed_val);
        } else {
          return "";
        }
      },
      calcComfortType: function (val) {
        val = Math.round(val);
        if (val <= 50) {
          return 0;
        } else if (val >= 51 && val <= 58) {
          return 1;
        } else if (val >= 59 && val <= 70) {
          return 1;
        } else if (val >= 71 && val <= 75) {
          return 1;
        } else if (val >= 76) {
          return 2;
        }
      },
    },
  });
};
document.addEventListener("DOMContentLoaded", loadFun);
