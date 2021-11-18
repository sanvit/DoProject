import React, { useState } from "react";
import { Icon } from "@iconify/react";
import { Link } from "react-router-dom";
import { useHistory } from "react-router";
import { useSelector } from "react-redux";
import Modal from "../ProjectEditPage/Modal";

export default function ProjectTypeBar(props) {
  const loginState = useSelector((state) => state.loginReducer);
  const [modalFlag, setModalFlag] = useState(0); // 1일때 모달창 열기

  const history = useHistory();
  let recruitColor = "a-color";
  let proceedColor = "a-color";
  let completeColor = "a-color";

  switch (props.state) {
    case "recruiting":
      recruitColor = "b-color";
      break;
    case "proceeding":
      proceedColor = "b-color";
      break;
    case "completed":
      completeColor = "b-color";
      break;
    default:
      return null;
  }

  return (
    <>
      <div className="project-bar">
        {modalFlag === 1 && (
          <Modal
            body={"로그인 해주세요"}
            buttons={"cancel-only"}
            setOpenFlag={setModalFlag}
          />
        )}
        <div className="project-bar-column1">
          <div className="recruit-project">
            <Link className={recruitColor} to="/projectlist/recruit">
              모집중인 프로젝트
            </Link>
          </div>
          <div className="proceed-project">
            <Link className={proceedColor} to="/projectlist/proceed">
              진행중인 프로젝트
            </Link>
          </div>
          <div className="public-project">
            <Link className={completeColor} to="/projectlist/complete">
              완성된 프로젝트
            </Link>
          </div>
        </div>
        <div className="project-bar-column2">
          <div
            className="create-project"
            onClick={() => {
              if (loginState) history.push("/project/edit");
              else {
                setModalFlag(1);
              }
            }}>
            프로젝트 생성
          </div>
          <Icon icon="mi:filter" style={{ fontSize: "2rem" }} />
        </div>
      </div>
    </>
  );
}
