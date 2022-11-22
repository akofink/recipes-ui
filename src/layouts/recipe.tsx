import ReactMarkdown from 'react-markdown'

export const Recipe = ({ markdown = '' }) => {
    return (
        <ReactMarkdown>
            { markdown }
        </ReactMarkdown>
    )
}