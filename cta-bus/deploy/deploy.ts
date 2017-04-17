import * as request from 'request-promise'
import * as _ from 'lodash'
import DockerCloud from 'dockercloud'
import * as qs from 'query-string'
import * as async from 'async';

const dockerCloud = new DockerCloud('brettneese', 'b95e5274-3683-4afe-96fc-40f3bee80c36')
const apiKey = 'engBxz8RTChXK892HduHUkpUP';

function getBusRouteId(routes) {
    return routes.rt;
}

function getServiceRouteIds(service) {
    const apiRoot = _.filter(service.calculated_envvars, { 'key': 'PROVIDER_API_ROOT' })[0].value;
    let routeArray = qs.parse(qs.extract(apiRoot))['rt'].split(',')

    return routeArray;
}

export function getRouteIds(callback) {
    request.get('http://www.ctabustracker.com/bustime/api/v2/getroutes?key=' + apiKey + '&format=json').then(function (body) {
        const data = JSON.parse(body);
        const response = _.map(data['bustime-response']['routes'], getBusRouteId);

        callback(null, response);
    });
}

export function getExistingDockerServices(routeIds, callback) {
    dockerCloud.findStackByName('cta-bus-poller').then(function (stack) {
        dockerCloud.getStackServices(stack).then(function (services) {
            const response = _.map(services, getServiceRouteIds)

            callback(null, routeIds, response[0])
        });
    });
}

export function launchNewServices(routeIds, existingRouteServices, callback) {
    const newServices = _.difference(routeIds, existingRouteServices)
    const newServicesByAccessKey = _.chunk(newServices, 50)

    _.each(newServicesByAccessKey, function (value, i) {
        const accessKey = ['engBxz8RTChXK892HduHUkpUP', 'EwzQBTexqkHa5GQ35KYUQW65U', 'DUyvf2RsGCKC6AVLYmCvumx8G'];
        const newServicesByCtaLimit = _.chunk(value, 10);

        _.each(newServicesByCtaLimit, function (service, j) {
            const routes = service.join(',');
            const serviceDefinition = {
                autodestroy: "OFF",
                autoredeploy: true,
                autorestart: "ALWAYS",
                container_envvars: [
                    {
                        key: "ENVIRONMENT",
                        value: "production"
                    },
                    {
                        key: "PROVIDER",
                        value: "CTA_BUS"
                    },
                    {
                        key: "PROVIDER_API_ROOT",
                        value: "http://www.ctabustracker.com/bustime/api/v2/getvehicles?key=" + accessKey[i] + "&rt=" + routes + "&format=json"
                    },
                    {
                        key: "PROVIDER_REFRESH_INTERVAL",
                        value: "60000"
                    }
                ],
                container_ports: [
                    {
                        inner_port: 8080,
                        protocol: "tcp",
                        published: true
                    }
                ],
                deployment_strategy: "EMPTIEST_NODE",
                image: "brettneese/opentransit-poller:latest",
                name: "cta-bus-" + service[0],
                sequential_deployment: true,
                stack: "/api/app/v1/brettneese/stack/ce8d6904-5d18-431c-b72c-3fede9d6e889/"
            }
            dockerCloud.createService(serviceDefinition).then(function (services) {
                callback(null, services)
            });
        });
    });
}

export function handler(event, context, cb) {
    async.waterfall([
        getRouteIds,
        getExistingDockerServices,
        launchNewServices
    ], function (err, result) {

        //console.log(result);
        // result now equals 'done'
    });
};

export default handler;