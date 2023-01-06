import { FC } from "react"

export const Error: FC = (props) => (
    <div>
        <h1>ERROR!</h1>
        <p>{ props }</p>
    </div>
);

export default Error;