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

export default class Home extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      daily: props.daily,
      dailyUpdated: this.convert_date(new Date()),
      realtime: props.realtime,
      realtimeUpdated: this.convert_date(new Date()),
      testing_graph_name: props.testing_graph_name,
      testing_graph: props.testing_graph
    }
    this.loadDaily_Realtime_Data = this.loadDaily_Realtime_Data.bind(this)
    this.convert_date = this.convert_date.bind(this)
  }

  componentDidMount() {
    if (!window.GA_INITIALIZED) {
      initGA()
      window.GA_INITIALIZED = true
    }
    logPageView()
    setInterval(this.loadDaily_Realtime_Data, 5000);
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
    try {
      const res_daily = await (await fetch(`/api/daily`)).json();
      const res_realtime = await (await fetch(`/api/realtime`)).json();

      // 
      const rand = res_daily.daily[Math.floor(Math.random() * res_daily.daily.length)];
      const testing_graph = (await (await fetch(`/api/getnumbers/` + rand[0])).json()).time_and_number;
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
          }
        ]
      }

      this.setState({
        daily: res_daily,
        dailyUpdated: this.convert_date(new Date()),
        realtime: res_realtime,
        realtimeUpdated: this.convert_date(new Date()),
        testing_graph_name: rand[0],
        testing_graph: data
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
                    <div className="col-lg-6">
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

Home.getInitialProps = async ({ req }) => {
  const baseURL = req ? `${req.protocol}://${req.get("Host")}` : "";
  const res_daily = await (await fetch(`${baseURL}/api/daily`)).json();
  const res_realtime = await (await fetch(`${baseURL}/api/realtime`)).json();
  const rand = res_daily.daily[Math.floor(Math.random() * res_daily.daily.length)];
  const testing_graph = (await (await fetch(`${baseURL}/api/getnumbers/` + rand[0])).json()).time_and_number;

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
      }
    ]
  }
  return {
    daily: res_daily,
    realtime: res_realtime,
    testing_graph_name: rand,
    testing_graph: data
  };

};
