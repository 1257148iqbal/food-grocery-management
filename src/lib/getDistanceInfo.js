const axios = require('axios').default;
const polyline = require('@mapbox/polyline');
const { successResponse } = require('../helpers/apiResponse');

const googleApiKey = 'AIzaSyA_ciMsx74Ck21Firr3yS0xwvL7M7gonf8';

const DistanceInfoGoogle = async ({ origin, distination }) => {
    try {
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude}, ${origin.longitute}&destination=${distination.latitude}, ${distination.longitute}&key=${googleApiKey}&mode=DRIVING`;

        const { data } = await axios.get(url);

        let legs = data.routes[0].legs[0];

        let distance = legs.distance;
        let duration = legs.duration;

        return { distance, duration };
    } catch (error) {
        return { status: false, error: error.message };
    }
};

const DistanceInfoGoogleWithWayPoints = async ({
    origin,
    destination,
    waypoints,
}) => {
    try {
        const waypointsStr = waypoints
            .map(point => `${point.latitude},${point.longitude}`)
            .join('|');

        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&waypoints=${waypointsStr}&key=${googleApiKey}&mode=DRIVING`;

        const { data } = await axios.get(url);

        const routes = data.routes[0];

        const overview_polyline = polyline.decode(
            routes.overview_polyline.points
        );

        const legs = routes.legs.map(leg => {
            const overview_polyline = leg?.steps?.flatMap(step =>
                polyline.decode(step?.polyline?.points)
            );

            return {
                distance: leg.distance,
                duration: leg.duration,
                overview_polyline,
            };
        });

        const totalDistance = legs.reduce(
            (acc, curr) => acc + curr.distance.value,
            0
        );
        const distance = {
            text: `${(totalDistance / 1000).toFixed(2)} km`,
            value: totalDistance,
        };

        const totalDuration = legs.reduce(
            (acc, curr) => acc + curr.duration.value,
            0
        );
        const duration = {
            text: `${Math.round(totalDuration / 60)} mins`,
            value: totalDuration,
        };

        return { distance, duration, legs, overview_polyline };
    } catch (error) {
        return { status: false, error: error.message };
    }
};

// const DistanceInfoGoogleWithWayPointsTest = async (req, res) => {
//     try {
//         const { origin, destination, waypoints } = req.query;

//         // const waypointsStr = waypoints
//         //     .map(point => `${point.latitude},${point.longitude}`)
//         //     .join('|');

//         const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&waypoints=${waypoints}&key=${googleApiKey}&mode=DRIVING`;

//         const { data } = await axios.get(url);

//         const routes = data.routes[0];

//         const overview_polyline = polyline.decode(
//             routes.overview_polyline.points
//         );
//         const legs = routes.legs.map(leg => {
//             const overview_polyline = leg.steps.flatMap(step =>
//                 polyline.decode(step.polyline.points)
//             );

//             return {
//                 distance: leg.distance,
//                 duration: leg.duration,
//                 overview_polyline,
//             };
//         });

//         const totalDistance = legs.reduce(
//             (acc, curr) => acc + curr.distance.value,
//             0
//         );
//         const distance = {
//             text: `${(totalDistance / 1000).toFixed(2)} km`,
//             value: totalDistance,
//         };

//         const totalDuration = legs.reduce(
//             (acc, curr) => acc + curr.duration.value,
//             0
//         );
//         const duration = {
//             text: `${Math.round(totalDuration / 60)} mins`,
//             value: totalDuration,
//         };

//         successResponse(res, {
//             message: 'Successfully download',
//             data: { distance, duration, legs, overview_polyline },
//         });
//     } catch (error) {
//         console.log(error);
//     }
// };

module.exports = {
    DistanceInfoGoogle,
    DistanceInfoGoogleWithWayPoints,
    // DistanceInfoGoogleWithWayPointsTest,
};
