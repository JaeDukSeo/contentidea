// React 
import React from 'react'
import ReactGA from 'react-ga';

// Next components
import Main from 'next/document'
import Link from 'next/link'

// custome 
import Sidebar from "../components/Sidebar"
import Nav from "../components/Nav"
import Footer from "../components/Footer"
import Scripts from '../components/Scripts'
import Header from '../components/Header'

// library
import fetch from "isomorphic-unfetch";
import { Line } from 'react-chartjs-2';

// tfjs and analytics
import * as tf from '@tensorflow/tfjs';
import timeseries from "timeseries-analysis"
import slayer from "slayer"

const initGA = () => {
  console.log('GA init')
  ReactGA.initialize('UA-130045033-3')
}
const logPageView = () => {
  console.log(`Logging pageview for ${window.location.pathname}`)
  ReactGA.set({ page: window.location.pathname })
  ReactGA.pageview(window.location.pathname)
}
const logEvent = (category = '', action = '') => {
  if (category && action) {
    ReactGA.event({ category, action })
  }
}
const logException = (description = '', fatal = false) => {
  if (description) {
    ReactGA.exception({ description, fatal })
  }
}
const timeConverter = function (UNIX_timestamp) {
  var a = new Date(UNIX_timestamp * 1000);
  var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var year = a.getFullYear();
  var month = months[a.getMonth()];
  var date = a.getDate();
  var hour = a.getHours();
  var min = a.getMinutes();
  var sec = a.getSeconds();
  var time = date + ' ' + month + ' ' + year;
  return time;
}
const createModel = function () {
  const model = tf.sequential();
  model.add(tf.layers.dense({ inputShape: [1], units: 3, useBias: true, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 3, useBias: true, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 1, useBias: true }));
  return model;
}

// Home Component
export default class Home extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      daily: props.daily,
      dailyUpdated: this.convert_date(new Date()),
      realtime: props.realtime,
      realtimeUpdated: this.convert_date(new Date()),
      testing_graph_name: props.testing_graph_name,
      testing_graph: props.testing_graph,
      model: createModel(),
    }
    this.loadDaily_Realtime_Data = this.loadDaily_Realtime_Data.bind(this)
    this.convert_date = this.convert_date.bind(this)
  }
  componentDidMount() {
    console.log('USE slayer to detect periods!')
    if (!window.GA_INITIALIZED) {
      initGA()
      window.GA_INITIALIZED = true
    }
    logPageView()
    setInterval(this.loadDaily_Realtime_Data, 8000);
  }
  convert_date(date) {
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var sec = date.getSeconds();
    var ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    minutes = minutes < 10 ? '0' + minutes : minutes;
    var strTime = hours + ':' + minutes + ':' + sec + ' ' + ampm;
    return strTime;
  }
  async loadDaily_Realtime_Data() {
    // Train the model  
    async function trainModel(model, inputs, labels) {
      const batchSize = 64;
      const epochs = 60;

      // Prepare the model for training.  
      model.compile({
        optimizer: tf.train.adam(),
        loss: tf.losses.absoluteDifference,
        metrics: ['mae'],
      });

      return await model.fit(inputs, labels, { batchSize, epochs, shuffle: false, });
    }
    // Test the model  
    async function testModel(model, normalizationData) {
      const { inputs, inputMax, inputMin, labelMin, labelMax } = normalizationData;
      const [xs, preds] = tf.tidy(() => {
        const xs = tf.linspace(0, 1, inputs.size);
        const preds = model.predict(xs.reshape([inputs.size, 1]));
        const unNormXs = xs.mul(inputMax.sub(inputMin)).add(inputMin);
        const unNormPreds = preds.mul(labelMax.sub(labelMin)).add(labelMin);
        return [unNormXs.dataSync(), unNormPreds.dataSync()];
      });

      // const predictedPoints = Array.from(xs).map((val, i) => { return { x: val, y: preds[i] } });
      return preds
    }
    // convert to tensor
    function convertToTensor(data) {
      // Wrapping these calculations in a tidy will dispose any 
      // intermediate tensors.

      return tf.tidy(() => {
        // Step 1. Shuffle the data    
        tf.util.shuffle(data);

        // Step 2. Convert data to Tensor
        const inputs = data.x
        const labels = data.y

        const inputTensor = tf.tensor2d(inputs, [inputs.length, 1]);
        const labelTensor = tf.tensor2d(labels, [labels.length, 1]);

        //Step 3. Normalize the data to the range 0 - 1 using min-max scaling
        const inputMax = inputTensor.max();
        const inputMin = inputTensor.min();
        const labelMax = labelTensor.max();
        const labelMin = labelTensor.min();

        const normalizedInputs = inputTensor.sub(inputMin).div(inputMax.sub(inputMin));
        const normalizedLabels = labelTensor.sub(labelMin).div(labelMax.sub(labelMin));

        return {
          inputs: normalizedInputs,
          labels: normalizedLabels,
          // Return the min/max bounds so we can use them later.
          inputMax,
          inputMin,
          labelMax,
          labelMin,
        }
      });
    }

    try {
      const res_daily = await (await fetch(`/api/daily`)).json();
      const res_realtime = await (await fetch(`/api/realtime`)).json();

      const rand = res_daily.daily[Math.floor(Math.random() * res_daily.daily.length)];
      const testing_graph = (await (await fetch(`/api/getnumbers/` + rand[0])).json()).time_and_number;

      // TIME SERIES ANALYSIS
      var period = 30
      var t = new timeseries.main(timeseries.adapter.fromArray(Object.values(testing_graph)));
      var moving_average = t.ma({ period: period }).data.map(e => e[1])
      var linear_moving_average = t.lwma({ period: period }).data.map(e => e[1])
      var John_Ehlers_iTrend = t.dsp_itrend({ alpha: 0.3 }).data.map(e => e[1])

      // TENSORFLOW
      var tf_data = { x: [...Array(Object.values(testing_graph).length).keys()], y: Object.values(testing_graph) }
      const tensorData = convertToTensor(tf_data);
      const { inputs, labels } = tensorData;
      await trainModel(this.state.model, inputs, labels);
      var predictedPoints = await testModel(this.state.model, tensorData)

      // SET THE DATA
      var data = {
        labels: Object.keys(testing_graph).map(e => timeConverter(e)),
        datasets: [
          {
            label: rand[0],
            fill: false,
            lineTension: 0.1,
            backgroundColor: 'rgba(75,192,192,0.4)',
            borderColor: 'rgba(75,192,192,1)',
            borderCapStyle: 'butt',
            borderDash: [],
            borderDashOffset: 0.0,
            borderJoinStyle: 'miter',
            pointBorderColor: 'rgba(75,192,192,1)',
            pointBackgroundColor: '#fff',
            pointBorderWidth: 1,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: 'rgba(75,192,192,1)',
            pointHoverBorderColor: 'rgba(220,220,220,1)',
            pointHoverBorderWidth: 2,
            pointRadius: 1,
            pointHitRadius: 10,
            data: Object.values(testing_graph)
          },
          // {
          //   label: rand[0] + ' Prediction',
          //   fill: true,
          //   lineTension: 0.1,
          //   pointHoverBorderWidth: 2,
          //   pointRadius: 1,
          //   pointHitRadius: 10,
          //   data: predictedPoints
          // },
          {
            label: rand[0] + ' MA',
            backgroundColor: 'red',
            fill: false,
            data: moving_average
          },
          {
            label: rand[0] + ' LMA',
            backgroundColor: 'blue',
            fill: false,
            data: linear_moving_average
          },
          {
            label: rand[0] + ' JEI',
            backgroundColor: 'green',
            fill: false,
            data: John_Ehlers_iTrend
          }
        ]
      }
      this.setState({
        daily: res_daily,
        dailyUpdated: this.convert_date(new Date()),
        realtime: res_realtime,
        realtimeUpdated: this.convert_date(new Date()),
        testing_graph_name: rand[0],
        testing_graph: data,
      })

    } catch (e) {
      console.error(e);
    }
  }

  render() {
    return (
      <div>
        <Header />

        <div id="page-top">
          <div id="wrapper">
            <Sidebar />

            <div id="content-wrapper" className="d-flex flex-column">
              <div id="content">
                <Nav />
                <div className="container-fluid">

                  <div className="d-sm-flex align-items-center justify-content-between mb-4">
                    <h1 className="h3 mb-0 text-gray-800">Dashboard</h1>
                    <a href="#" className="d-none d-sm-inline-block btn btn-sm btn-primary shadow-sm"><i className="fas fa-download fa-sm text-white-50"></i> Generate Report</a>
                  </div>

                  <div className="row">
                    <div className="col-lg-12">
                      <div className="card shadow mb-4">
                        <a href="#collapseCardExample3" className="d-block card-header py-3" data-toggle="collapse" role="button" aria-expanded="true" aria-controls="collapseCardExample3">
                          <h6 className="m-0 font-weight-bold text-primary">
                            Trend for {this.state.testing_graph_name}
                            <p className="text-xs">Last Updated: {this.state.dailyUpdated} </p>
                          </h6>
                        </a>
                        <div className="collapse show" id="collapseCardExample3">
                          <div className="card-body">
                            {
                              this.state.testing_graph &&
                              <Line data={this.state.testing_graph} />
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="row">

                    <div className="col-lg-6">
                      <div className="card shadow mb-4">
                        <a href="#collapseCardExample1" className="d-block card-header py-3" data-toggle="collapse" role="button" aria-expanded="true" aria-controls="collapseCardExample">
                          <h6 className="m-0 font-weight-bold text-primary">Daily Trends <p className="text-xs">Last Updated: {this.state.dailyUpdated} </p></h6>
                        </a>
                        <div className="collapse show" id="collapseCardExample1">
                          <div className="card-body">

                            <ul className="list-group">
                              {this.state.daily.daily.map(function (data) {
                                return (
                                  <li className="list-group-item" key={data[0]}>{data[0]} <span className="badge">{data[1]}</span></li>
                                )
                              })}
                            </ul>

                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="col-lg-6">
                      <div className="card shadow mb-4">
                        <a href="#collapseCardExample2" className="d-block card-header py-3" data-toggle="collapse" role="button" aria-expanded="true" aria-controls="collapseCardExample">
                          <h6 className="m-0 font-weight-bold text-primary">Real Time Trends <p className="text-xs">Last Updated: {this.state.realtimeUpdated}   </p></h6>
                        </a>
                        <div className="collapse show" id="collapseCardExample2">
                          <div className="card-body">

                            <ul className="list-group">
                              {this.state.realtime.realtime.map(function (data) {
                                return (
                                  <li className="list-group-item" key={data}>{data} <span className="badge"></span></li>
                                )
                              })}
                            </ul>

                          </div>
                        </div>
                      </div>
                    </div>

                  </div>

                </div>
              </div>

              <Footer />
            </div>
          </div>

          <Scripts />
        </div>
      </div>
    )
  }
}












// server side rendering
Home.getInitialProps = async ({ req }) => {
  const baseURL = req ? `${req.protocol}://${req.get("Host")}` : "";
  const res_daily = await (await fetch(`${baseURL}/api/daily`)).json();
  const res_realtime = await (await fetch(`${baseURL}/api/realtime`)).json();
  const rand = res_daily.daily[Math.floor(Math.random() * res_daily.daily.length)];
  const testing_graph = (await (await fetch(`${baseURL}/api/getnumbers/` + rand[0])).json()).time_and_number;

  // TIME SERIES ANALYSIS
  const period = 30
  const t = new timeseries.main(timeseries.adapter.fromArray(Object.values(testing_graph)));
  const moving_average = t.ma({ period: period }).data.map(e => e[1])
  const linear_moving_average = t.lwma({ period: period }).data.map(e => e[1])
  const John_Ehlers_iTrend = t.dsp_itrend({ alpha: 0.3 }).data.map(e => e[1])

  var data = {
    labels: Object.keys(testing_graph).map(e => timeConverter(e)),
    datasets: [
      {
        label: rand[0],
        fill: false,
        lineTension: 0.1,
        backgroundColor: 'rgba(75,192,192,0.4)',
        borderColor: 'rgba(75,192,192,1)',
        borderCapStyle: 'butt',
        borderDash: [],
        borderDashOffset: 0.0,
        borderJoinStyle: 'miter',
        pointBorderColor: 'rgba(75,192,192,1)',
        pointBackgroundColor: '#fff',
        pointBorderWidth: 1,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: 'rgba(75,192,192,1)',
        pointHoverBorderColor: 'rgba(220,220,220,1)',
        pointHoverBorderWidth: 2,
        pointRadius: 1,
        pointHitRadius: 10,
        data: Object.values(testing_graph)
      },
      {
        label: rand[0] + ' MA',
        backgroundColor: 'red',
        fill: false,
        data: moving_average
      },
      {
        label: rand[0] + ' LMA',
        backgroundColor: 'blue',
        fill: false,
        data: linear_moving_average
      },
      {
        label: rand[0] + ' JEI',
        backgroundColor: 'green',
        fill: false,
        data: John_Ehlers_iTrend
      }
    ]
  }

  return {
    daily: res_daily,
    realtime: res_realtime,
    testing_graph_name: rand,
    testing_graph: data,
  };

};
