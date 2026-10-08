import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartComponent } from 'chart.js';
import { ApexAxisChartSeries, ApexNonAxisChartSeries, ApexResponsive, ApexChart, ApexXAxis, ApexDataLabels, ApexGrid, ApexStroke, ApexTitleSubtitle, ApexFill, ApexMarkers, ApexPlotOptions, ApexYAxis, ApexTooltip, ApexLegend } from 'ng-apexcharts';


export type ChartOptions = {
  series: ApexAxisChartSeries | ApexNonAxisChartSeries;
  responsive: ApexResponsive[];
  chart: ApexChart;
  xaxis: ApexXAxis;
  dataLabels: ApexDataLabels;
  grid: ApexGrid;
  stroke: ApexStroke;
  title: ApexTitleSubtitle;
  fill: ApexFill,
  markers: ApexMarkers,
  colors: string[];
  plotOptions: ApexPlotOptions;
  yaxis: ApexYAxis;
  tooltip: ApexTooltip;
  labels: string[];
  legend: ApexLegend;
};



@Component({
  selector: 'app-dashboard',
  //standalone: true,
 // imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})

export class DashboardComponent {

  @ViewChild("chart") chart: ChartComponent;
  
    public AnalyticsChart1: Partial<ChartOptions>;
    public AnalyticsChart2: Partial<ChartOptions>;
    public AnalyticsChart3: Partial<ChartOptions>;
    public AnalyticsChart4: Partial<ChartOptions>;
    public AnalyticsChart5: Partial<ChartOptions>;
    public AnalyticsChart6: Partial<ChartOptions>;
    public AnalyticsChart7: Partial<ChartOptions>;
    public AnalyticsChart8: Partial<ChartOptions>;
    public AnalyticsChart9: Partial<ChartOptions>;
  
    constructor() {
  
  
  
      // chart 1
      this.AnalyticsChart1 = {
        series
          : [
            {
              name: "Revenu",
              data: [25, 66, 41, 59, 25, 44, 12, 36, 9, 21]
            }
          ],
        chart: {
          width: 130,
          height: 50,
          type: "bar",
          zoom: {
            enabled: false
          },
          toolbar: {
            show: !1
          },
          sparkline: {
            enabled: !0
          }
        },
        fill: {
          type: "gradient",
          gradient: {
            shade: "dark",
            gradientToColors: ["#a52db7"],
            shadeIntensity: 1,
            type: "vertical",
            opacityFrom: 1,
            opacityTo: 1,
            stops: [0, 100, 100, 100]
          }
        },
        colors: ["#a52db7"],
        plotOptions: {
          bar: {
            horizontal: false,
            borderRadius: 2.5,
            //borderRadiusApplication: 'around',
            // borderRadiusWhenStacked: 'last',
            //distributed: true,
            columnWidth: '55%',
          }
        },
        dataLabels: {
          enabled: false
        },
        stroke: {
          width: 1,
          curve: "smooth"
        },
        grid: {
          show: true,
          borderColor: 'rgba(0, 0, 0, 0.15)',
          strokeDashArray: 4,
        },
        xaxis: {
          categories: [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep"
          ]
        },
        tooltip: {
          theme: "dark",
        }
      };
  
  
  
      // chart 2
      this.AnalyticsChart2 = {
        series
          : [
            {
              name: "Revenu",
              data: [25, 66, 41, 59, 25, 44, 12, 36, 9, 21]
            }
          ],
        chart: {
          width: 130,
          height: 50,
          type: "bar",
          zoom: {
            enabled: false
          },
          toolbar: {
            show: !1
          },
          sparkline: {
            enabled: !0
          }
        },
        fill: {
          type: "gradient",
          gradient: {
            shade: "dark",
            gradientToColors: ["#ff4081"],
            shadeIntensity: 1,
            type: "vertical",
            opacityFrom: 1,
            opacityTo: 1,
            stops: [0, 100, 100, 100]
          }
        },
        colors: ["#ff4081"],
        plotOptions: {
          bar: {
            horizontal: false,
            borderRadius: 2.5,
            //borderRadiusApplication: 'around',
            // borderRadiusWhenStacked: 'last',
            //distributed: true,
            columnWidth: '55%',
          }
        },
        dataLabels: {
          enabled: false
        },
        stroke: {
          width: 1,
          curve: "smooth"
        },
        grid: {
          show: true,
          borderColor: 'rgba(0, 0, 0, 0.15)',
          strokeDashArray: 4,
        },
        xaxis: {
          categories: [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep"
          ]
        },
        tooltip: {
          theme: "dark",
        }
      };
  
  
  
  
      // chart 3
      this.AnalyticsChart3 = {
        series
          : [
            {
              name: "Revenu",
              data: [25, 66, 41, 59, 25, 44, 12, 36, 9, 21]
            }
          ],
        chart: {
          width: 130,
          height: 50,
          type: "bar",
          zoom: {
            enabled: false
          },
          toolbar: {
            show: !1
          },
          sparkline: {
            enabled: !0
          }
        },
        fill: {
          type: "gradient",
          gradient: {
            shade: "dark",
            gradientToColors: ["#00a294"],
            shadeIntensity: 1,
            type: "vertical",
            opacityFrom: 1,
            opacityTo: 1,
            stops: [0, 100, 100, 100]
          }
        },
        colors: ["#00a294"],
        plotOptions: {
          bar: {
            horizontal: false,
            borderRadius: 2.5,
            //borderRadiusApplication: 'around',
            // borderRadiusWhenStacked: 'last',
            //distributed: true,
            columnWidth: '55%',
          }
        },
        dataLabels: {
          enabled: false
        },
        stroke: {
          width: 1,
          curve: "smooth"
        },
        grid: {
          show: true,
          borderColor: 'rgba(0, 0, 0, 0.15)',
          strokeDashArray: 4,
        },
        xaxis: {
          categories: [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep"
          ]
        },
        tooltip: {
          theme: "dark",
        }
      };
  
  
  
      // chart 4
      this.AnalyticsChart4 = {
        series
          : [
            {
              name: "Revenu",
              data: [25, 66, 41, 59, 25, 44, 12, 36, 9, 21]
            }
          ],
        chart: {
          foreColor: "#9ba7b2",
          width: 130,
          height: 50,
          type: "bar",
          zoom: {
            enabled: false
          },
          toolbar: {
            show: !1
          },
          sparkline: {
            enabled: !0
          }
        },
        fill: {
          type: "gradient",
          gradient: {
            shade: "dark",
            gradientToColors: ["#25a0f4"],
            shadeIntensity: 1,
            type: "vertical",
            opacityFrom: 1,
            opacityTo: 1,
            stops: [0, 100, 100, 100]
          }
        },
        colors: ["#25a0f4"],
        plotOptions: {
          bar: {
            horizontal: false,
            borderRadius: 2.5,
            //borderRadiusApplication: 'around',
            // borderRadiusWhenStacked: 'last',
            //distributed: true,
            columnWidth: '55%',
          }
        },
        dataLabels: {
          enabled: false
        },
        stroke: {
          width: 1,
          curve: "smooth"
        },
        grid: {
          show: true,
          borderColor: 'rgba(0, 0, 0, 0.15)',
          strokeDashArray: 4,
        },
        xaxis: {
          categories: [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep"
          ]
        },
        tooltip: {
          theme: "dark",
        }
      };
  
  
  
      // chart 5
  this.AnalyticsChart5 = {
    series: [
      {
        name: "Spend",
        data: [240, 280, 290, 270, 300, 330, 310, 300, 320, 350, 380, 400]
      }
    ],
  
    chart: {
      type: "area",
      height: 360,
      toolbar: { show: false },
      zoom: { enabled: false }
    },
  
    dataLabels: {
      enabled: false
    },
  
    stroke: {
      curve: "smooth",
      width: 3
    },
  
    colors: ["#2dd4bf"],   // ✅ teal line
  
    fill: {
      type: "gradient",
      gradient: {
        shade: "light",
        type: "vertical",
        shadeIntensity: 0,
        gradientToColors: ["#99f6e4"], // ✅ light teal
        opacityFrom: 0.8,
        opacityTo: 0.1,
        stops: [0, 100]
      }
    },
  
    markers: {
      size: 0
    },
  
    grid: {
      borderColor: "#e5e7eb",
      strokeDashArray: 4,
      padding: {
        left: 10,
        right: 10
      }
    },
  
    xaxis: {
      categories: [
        "Jan","Feb","Mar","Apr","May","Jun",
        "Jul","Aug","Sep","Oct","Nov","Dec"
      ],
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
  
    yaxis: {
      labels: {
        style: {
          colors: "#9ca3af"
        }
      }
    },
  
    tooltip: {
      theme: "light"
    },
  
    legend: {
      show: false
    }
  };
  
  
  
      // chart 6
     this.AnalyticsChart6 = {
    series: [
      {
        name: "Spend",
        data: [240, 280, 290, 270, 300, 330, 310, 300, 320, 350, 380, 400]
      }
    ],
  
    chart: {
      type: "area",
      height: 360,
      toolbar: { show: false },
      zoom: { enabled: false }
    },
  
    dataLabels: { enabled: false },
  
    stroke: {
      curve: "smooth",
      width: 3
    },
  
    colors: ["#ff6a4d"], // 🔶 ORANGE LINE
  
    fill: {
      type: "gradient",
      gradient: {
        shade: "light",
        type: "vertical",
        gradientToColors: ["#ffd1c7"],
        opacityFrom: 0.9,
        opacityTo: 0.15,
        stops: [0, 100]
      }
    },
  
    grid: {
      borderColor: "#e5e7eb",
      strokeDashArray: 4
    },
  
    xaxis: {
      categories: [
        "Jan","Feb","Mar","Apr","May","Jun",
        "Jul","Aug","Sep","Oct","Nov","Dec"
      ]
    },
  
    tooltip: {
      theme: "light"
    }
  };
  
  
  
      // chart 7
  this.AnalyticsChart7 = {
    series: [48, 52],   // ✅ 2 parts only
  
    labels: ["Completed", "Remaining"],
  
    chart: {
      type: "donut",
      height: 280
    },
  
    colors: ["#2dd4bf", "#0f172a"], // ✅ teal + dark (SS match)
  
    dataLabels: {
      enabled: false
    },
  
    plotOptions: {
      pie: {
        donut: {
          size: "72%",   // ✅ thickness like SS
          labels: {
            show: true,
            name: {
              show: false   // ❌ name hide
            },
            value: {
              show: true,
              fontSize: "28px",
              fontWeight: 600,
              color: "#374151",
              offsetY: 6,
              formatter: () => "768 Total"   // ✅ center digit ONLY
            }
          }
        }
      }
    },
  
    stroke: {
      width: 6
    },
  
    legend: {
      show: false
    },
  
    tooltip: {
      enabled: false
    }
  };
  
  
  
    }
  
    ngOnInit(): void {
      // $.getScript('./assets/js/analytics-dashboard.js');
    }

}
