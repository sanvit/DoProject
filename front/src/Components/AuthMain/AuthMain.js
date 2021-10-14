import React, { useEffect } from "react";
import { useHistory, useLocation } from "react-router";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import ReactLoading from "../CommonComponent/Loading";
import loginReducer from "../../reducer/LoginReducer";

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
        // loginReducer state 변경
        // console.log(Data);
        dispatch({ type: "LOGIN", payload: Data.user });
        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("refreshToken", refreshToken);
        history.goBack();
      } catch (err) {
        console.log(err);
      }
    };
    getData();
  }, [code, dispatch, history]);
  return loginState === null && <ReactLoading type="spin" color="#a7bc5b" />;
}
