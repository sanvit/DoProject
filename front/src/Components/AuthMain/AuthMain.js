import React, { useEffect } from "react";
import { useHistory, useLocation } from "react-router";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import ReactLoading from "../CommonComponent/Loading";
import socket from "../../socket";

export default function AuthMain() {
  const location = useLocation().search;
  const code = new URLSearchParams(location).get("code");
  let dispatch = useDispatch();
  let history = useHistory();
  let loginState = useSelector((state) => state.loginReducer);

  // 42API에서 User Data 받아오기.
  useEffect(() => {
    const getData = async () => {
      try {
        const { data: Data } = await axios.get(
          `http://localhost:5000/auth/signin?code=${code}`
        );
        const {
          token: { accessToken, refreshToken },
        } = Data;
        // socket 인증
        socket.emit("authorization", {
          token: localStorage.getItem("accessToken"),
        });
        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("refreshToken", refreshToken);
        // loginReducer state 변경
        dispatch({ type: "LOGIN", payload: Data.user });
        history.goBack();
      } catch (err) {
        console.log(err);
      }
    };
    getData();
  }, []);
  return loginState === null && <ReactLoading type="spin" color="#a7bc5b" />;
}
