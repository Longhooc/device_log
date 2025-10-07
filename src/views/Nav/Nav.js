import React from 'react';
import './Nav.scss';


import {
     NavLink
} from "react-router-dom";

class Nav extends React.Component {
    render() {
        return (
            <div className="topnav">
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
                <NavLink to="/link-manager" activeClassName="active" exact={true}>
                    Quản lý Link
                </NavLink>
                <NavLink to="/smartph" activeClassName="active" exact={true}>
                    SMARTPH
                </NavLink>
                <NavLink to="/bestlab" activeClassName="active" exact={true}>
                    BESTLAB
                </NavLink>
                <NavLink to="/device-management" activeClassName="active" exact={true}>
                    Quản lý thiết bị
                </NavLink>

            </div>
        );
    }
}
export default Nav;