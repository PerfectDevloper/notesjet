/// <reference types="react" />
import { IconNames } from "../../toolbar/icons";
export declare type MenuItem = {
    type: "menuitem" | "seperator";
    key: string;
    component?: (props: any) => JSX.Element;
    onClick?: () => void;
    title?: string;
    icon?: IconNames;
    tooltip?: string;
    isDisabled?: boolean;
    isHidden?: boolean;
    isChecked?: boolean;
    hasSubmenu?: boolean;
    modifier?: string;
    items?: MenuItem[];
};
