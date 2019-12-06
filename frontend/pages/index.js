// React 
import React from 'react'
import ReactGA from 'react-ga';

// Next components
import Head from 'next/head'
import Main from 'next/document'
import Link from 'next/link'

// custome 
import Sidebar from "../components/Sidebar"
import Nav from "../components/Nav"
import Footer from "../components/Footer"
import Scripts from '../components/Scripts'

// library
import fetch from "isomorphic-unfetch";

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

export default class Home extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      daily: props.daily,
      dailyUpdated: Date(),
      realtime: props.realtime,
      realtimeUpdated: Date()
    }

    this.loadDaily_Realtime_Data = this.loadDaily_Realtime_Data.bind(this)
  }

  componentDidMount() {
    if (!window.GA_INITIALIZED) {
      initGA()
      window.GA_INITIALIZED = true
    }
    logPageView()
    setInterval(this.loadDaily_Realtime_Data, 3000);
  }

  async loadDaily_Realtime_Data() {
    try {
      const res_daily = await fetch(`/api/daily`);
      const res_realtime = await fetch(`/api/realtime`);
      this.setState({
        daily: await res_daily.json(),
        dailyUpdated: Date(),
        realtime: await res_realtime.json(),
        realtimeUpdated: Date()
      })
    } catch (e) {
      console.error(e);
    }
  }

  render() {

    return (
      <div>

        <Head>
          {/* Title and meta */}
          <title>Content Ideas - Ideas</title>
          <meta charSet="utf-8"></meta>
          <meta httpEquiv="X-UA-Compatible" content="IE=edge"></meta>
          <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no"></meta>

          <meta name="description" content="Wondering what kind of content to make on YouTube? Instagram? spotify? or any platform? This website is for you! 
          See what kind of ideas are trending now, helping you go virial!"></meta>
          <meta name="author" content=""></meta>

          <link href="vendor/fontawesome-free/css/all.min.css" rel="stylesheet" type="text/css"></link>
          <link href="https://fonts.googleapis.com/css?family=Nunito:200,200i,300,300i,400,400i,600,600i,700,700i,800,800i,900,900i" rel="stylesheet"></link>
          <link href="css/sb-admin-2.min.css" rel="stylesheet"></link>
          <link rel="shortcut icon" type="image/png" href="idea.png" />
        </Head>

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

                  {/*  */}
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
                                  <li className="list-group-item" key={data}>{data} <span className="badge"></span></li>
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
                  {/*  */}


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
  const res_daily = await fetch(`${baseURL}/api/daily`);
  const res_realtime = await fetch(`${baseURL}/api/realtime`);
  return {
    daily: await res_daily.json(),
    realtime: await res_realtime.json(),
  };
};
