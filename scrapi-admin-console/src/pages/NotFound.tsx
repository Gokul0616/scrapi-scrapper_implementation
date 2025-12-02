import React from 'react';
import { Link } from 'react-router-dom';

export const NotFound: React.FC = () => {
    return (
        <div className="min-h-screen flex flex-col justify-center items-center bg-gray-100">
            <h1 className="text-4xl font-bold text-gray-900">404</h1>
            <p className="mt-2 text-lg text-gray-600">Page not found</p>
            <Link to="/" className="mt-4 text-aws-blue hover:underline">
                Go back home
            </Link>
        </div>
    );
};
