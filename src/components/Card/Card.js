import './Card.css';

export default function Card(props) {
    const { onClick } = props; // Accessing the onClick prop argument

    return (
        <div className="card" onClick={onClick}>
            <div className="loading-text">
                <h1>{props.state}</h1>
            </div>
            {
                props.isDone ? (
                    <div className="loading-spinner">
                        <span className="loader"></span> 
                    </div>
                ) : null
            }
        </div>
    );

}