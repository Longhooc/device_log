import React from 'react';
import './Nav.scss';


import {
     NavLink
} from "react-router-dom";

class Nav extends React.Component {
    render() {
        return (
            <div class="topnav">
                {/* <Header /> */}
                <NavLink to="/home" activeClassName="active" exact={true}>
                    <div className="logo-container">
                        <img
                            src="/ph.png"
                            alt="Logo"
                            className="logo"
                        />
                    </div>
                </NavLink>
                <NavLink to="/home" activeClassName="active" exact={true}>
                    HOME
                </NavLink>
                <NavLink to="/" activeClassName="active" exact={true}>
                    Khai báo
                </NavLink>
                <NavLink to="/hdsd" activeClassName="active" exact={true}>
                    Hướng dẫn sử dụng
                </NavLink>

            </div>
        );
    }
}
export default Nav;