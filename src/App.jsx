import React, { useState, useEffect, useRef } from "react";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl"; // set backend to webgl
import Loader from "./components/loader";
import ButtonHandler from "./components/btn-handler";
import { detect, detectVideo } from "./utils/detect";
import ReCAPTCHA from "react-google-recaptcha";
import * as htmlToImage from "html-to-image";
import FileSaver from "file-saver";
import pluralize from "pluralize";
import "./style/App.css";

const App = () => {
  const [loading, setLoading] = useState({ loading: true, progress: 0 }); // loading state
  const [model, setModel] = useState({
    net: null,
    inputShape: [1, 0, 0, 3],
  }); // init model & input shape

  // references
  const imageRef = useRef(null);
  const cameraRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const captchaImgIframeRef = useRef(null);
  // model configs
  const modelName = "yolov8n";

  const [status, setStatus] = useState(null);
  const [captchaData, setCaptchaData] = useState({ key: "" });

  useEffect(() => {
    tf.ready().then(async () => {
      const yolov8 = await tf.loadGraphModel(
        `${window.location.href}/${modelName}_web_model/model.json`,
        {
          onProgress: (fractions) => {
            setLoading({ loading: true, progress: fractions }); // set loading fractions
          },
        }
      ); // load model

      // warming up model
      const dummyInput = tf.ones(yolov8.inputs[0].shape);
      const warmupResults = yolov8.execute(dummyInput);

      setLoading({ loading: false, progress: 1 });
      setModel({
        net: yolov8,
        inputShape: yolov8.inputs[0].shape,
      }); // set model & input shape

      tf.dispose([warmupResults, dummyInput]); // cleanup memory
    });
  }, []);

  const onChange = (value) => {
    console.log("Captcha value:", value);
  };

  const handleBypassRecaptcha = async () => {
    setStatus("Processing...");
    setCaptchaData({ key: "" });
    imageRef.current.style.display = "none";
    const recaptchaCheckbox = document.querySelector("iframe");
    recaptchaCheckbox.contentWindow.document
      .querySelector(".recaptcha-checkbox")
      .click();

    await new Promise((r) => setTimeout(r, 2000));

    captchaImgIframeRef.current = document.querySelector(
      "iframe[title='recaptcha challenge expires in two minutes']"
    );

    let key =
      captchaImgIframeRef.current.contentWindow.document.querySelector(
        "strong"
      ).textContent;
    if (key) {
      key = pluralize.singular(key);
    }

    setCaptchaData({ key });

    const result = await htmlToImage.toBlob(captchaImgIframeRef.current, {
      includeQueryParams: true,
    });
    imageRef.current.src = URL.createObjectURL(result);
    imageRef.current.style.display = "block";
    setStatus("");
  };

  return (
    <div className="App">
      {loading.loading && (
        <Loader>Loading model... {(loading.progress * 100).toFixed(2)}%</Loader>
      )}
      <div className="header">
        <h1>Auto pass reCaptcha</h1>

        <p>
          Serving : <code className="code">{modelName}</code>
        </p>
      </div>

      <div className="container">
        <div>
          <ReCAPTCHA
            sitekey="6Les6kMpAAAAAO0SCEiXUKBIeSTf9rC8rXheCvO-"
            onChange={onChange}
          />
        </div>
        <div className="process-image">
          <button onClick={handleBypassRecaptcha}>Run</button>

          {status && <p>{status}</p>}
          {captchaData.key && (
            <div>
              Keyword: <b>{captchaData.key}</b>
            </div>
          )}

          <div className="content">
            <img
              src="#"
              ref={imageRef}
              onLoad={() => {
                detect(
                  imageRef.current,
                  captchaImgIframeRef.current,
                  captchaData,
                  model,
                  canvasRef.current
                );
              }}
            />
            <canvas
              width={model.inputShape[1]}
              height={model.inputShape[2]}
              ref={canvasRef}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
