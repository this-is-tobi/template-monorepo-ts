# template-monorepo-ts

![Version: 0.1.0](https://img.shields.io/badge/Version-0.1.0-informational?style=flat-square) ![Type: application](https://img.shields.io/badge/Type-application-informational?style=flat-square) ![AppVersion: 0.1.0](https://img.shields.io/badge/AppVersion-0.1.0-informational?style=flat-square)

A Helm chart to deploy template-monorepo-ts.

## Requirements

| Repository | Name | Version |
|------------|------|---------|
| https://cloudnative-pg.github.io/charts | cnpg(cluster) | 0.9.0 |
| https://cloudnative-pg.github.io/charts | cnpg-keycloak(cluster) | 0.9.0 |
| https://grafana-community.github.io/helm-charts | tempo | 2.3.0 |
| https://open-telemetry.github.io/opentelemetry-helm-charts | opentelemetry-collector | 0.171.0 |
| https://prometheus-community.github.io/helm-charts | kube-prometheus-stack | 88.5.4 |
| oci://registry-1.docker.io/cloudpirates | keycloak | 0.21.32 |
| oci://registry-1.docker.io/cloudpirates | redis | 0.34.23 |

## Values

### General

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| cnpg | object | `{"backups":{"enabled":false},"cluster":{"affinity":{"topologyKey":"topology.kubernetes.io/zone"},"imageName":"ghcr.io/cloudnative-pg/postgresql:18.6","initdb":{"database":"app","owner":"app"},"instances":3,"monitoring":{"enabled":false,"instrumentation":{"logicalReplication":false}},"resources":{"limits":{"cpu":"500m","memory":"1Gi"},"requests":{"cpu":"250m","memory":"512Mi"}},"storage":{"size":"3Gi"},"walStorage":{"enabled":true,"size":"2Gi"}},"enabled":false}` | ------------------------------------------------------------------------- PostgreSQL via CloudNative-PG operator (application database). Ref: https://artifacthub.io/packages/helm/cloudnative-pg/cluster The cluster is named <release>-cnpg: its services are <release>-cnpg-rw (primary), -ro (replicas) and -r (any instance), and the operator keeps the application user's credentials and connection info (host, port, dbname, username, password, uri) in the <release>-cnpg-app secret. The chart has no extraObjects: a NetworkPolicy for the cluster goes in the top-level extraObjects. |
| commonLabels | object | `{}` | Add labels to all the deployed resources |
| extraObjects | list | `[]` | Add extra specs dynamically to this chart. |
| fullnameOverride | string | `""` | String to fully override the default application name. |
| kube-prometheus-stack | object | `{"alertmanager":{"enabled":false},"enabled":false,"grafana":{"additionalDataSources":[{"access":"proxy","isDefault":false,"name":"Tempo","type":"tempo","uid":"tempo","url":"http://tempo:3200"}],"adminPassword":"","containerSecurityContext":{"allowPrivilegeEscalation":false,"capabilities":{"drop":["ALL"]},"readOnlyRootFilesystem":false},"enabled":true,"ingress":{"enabled":false},"podSecurityContext":{"fsGroup":472,"runAsNonRoot":true,"runAsUser":472,"seccompProfile":{"type":"RuntimeDefault"}},"resources":{"limits":{"cpu":"200m","memory":"256Mi"},"requests":{"cpu":"100m","memory":"128Mi"}}},"kubeStateMetrics":{"enabled":true},"nodeExporter":{"enabled":true},"prometheus":{"prometheusSpec":{"podMonitorSelectorNilUsesHelmValues":false,"resources":{"limits":{"cpu":"500m","memory":"1Gi"},"requests":{"cpu":"250m","memory":"512Mi"}},"retention":"15d","serviceMonitorSelectorNilUsesHelmValues":false}}}` | ------------------------------------------------------------------------- Prometheus + Grafana + AlertManager + kube-state-metrics + node-exporter. Ref: https://artifacthub.io/packages/helm/prometheus-community/kube-prometheus-stack |
| nameOverride | string | `""` | Provide a name in place of the default application name. |

### Global

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| global.env | object | `{}` | Map or array of environment variables to inject into all containers (`valueFrom` supported). |
| global.envCm | object | `{}` | Map of environment variables to inject into a configmap loaded by all containers (`valueFrom` not supported). |
| global.envSecret | object | `{}` | Map of environment variables to inject into a secret loaded by all containers (`valueFrom` not supported). |
| global.httpRoute | object | `{}` | Globally shared httproute configuration. |
| global.imageRegistry | string | `""` | Global Docker image registry |
| global.ingress | object | `{}` | Globally shared ingress configuration. |

### Api

#### General

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| api.affinity | object | `{}` | Affinity used for app pod. |
| api.args | list | `[]` | Api container command args. |
| api.command | list | `[]` | Api container command. |
| api.containerPort | int | `8080` | Api container port number. |
| api.containerPortName | string | `"http"` | Api container port name. |
| api.env | object | `{}` | Map or array of environment variables to inject into the app container (`valueFrom` supported). |
| api.envCm | object | `{}` | Map of environment variables to inject into a configmap loaded by the app container (`valueFrom` not supported). |
| api.envFrom | list | `[]` | Api container env variables loaded from configmap or secret reference. |
| api.envSecret | object | `{}` | Map of environment variables to inject into a secret loaded by the app container (`valueFrom` not supported). |
| api.extraContainers | list | `[]` | Extra containers to add to the app pod as sidecars. |
| api.extraPorts | list | `[]` | Api extra container ports. |
| api.hostAliases | list | `[]` | Host aliases that will be injected at pod-level into /etc/hosts. |
| api.imagePullSecrets | list | `[]` | Image credentials configuration. |
| api.initContainers | list | `[]` | Extra init containers to add to the app pod. |
| api.nodeSelector | object | `{}` | Default node selector for app. |
| api.podAnnotations | object | `{}` | Annotations for the app deployed pods. |
| api.podLabels | object | `{}` | Labels for the app deployed pods. |
| api.podSecurityContext | object | `{}` | Toggle and define pod-level security context. |
| api.replicaCount | int | `1` | The number of application controller pods to run. |
| api.revisionHistoryLimit | int | `10` | Revision history limit for the app. |
| api.securityContext | object | `{"allowPrivilegeEscalation":false,"capabilities":{"drop":["ALL"]},"readOnlyRootFilesystem":true,"runAsNonRoot":true,"seccompProfile":{"type":"RuntimeDefault"}}` | Toggle and define container-level security context. |
| api.statefulset | bool | `false` | Should the app run as a StatefulSet instead of a Deployment. |
| api.tolerations | list | `[]` | Default tolerations for app. |
| api.volumeClaims | list | `[]` | List of volumeClaims to add. |
| api.volumeMounts | list | `[]` | List of mounts to add (normally used with `volumes` or `volumeClaims`). |
| api.volumes | list | `[]` | List of volumes to add. |

#### Autoscaling

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| api.autoscaling.enabled | bool | `false` | Enable Horizontal Pod Autoscaler for the app. |
| api.autoscaling.maxReplicas | int | `3` | Maximum number of replicas for the app. |
| api.autoscaling.minReplicas | int | `1` | Minimum number of replicas for the app. |
| api.autoscaling.targetCPUUtilizationPercentage | int | `80` | Average CPU utilization percentage for the app. |
| api.autoscaling.targetMemoryUtilizationPercentage | int | `80` | Average memory utilization percentage for the app. |

#### GrpcRoute

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| api.grpcRoute.annotations | object | `{}` | Additional GRPCRoute annotations. |
| api.grpcRoute.enabled | bool | `false` | Enable a GRPCRoute resource for this service. |
| api.grpcRoute.hostnames | list | `[]` | Hostnames for the GRPCRoute to match. |
| api.grpcRoute.labels | object | `{}` | Additional GRPCRoute labels. |
| api.grpcRoute.parentRefs | list | `[]` | Parent references (Gateways) to attach the GRPCRoute to. |
| api.grpcRoute.rules | list | `[]` | Routing rules for the GRPCRoute. |

#### HttpRoute

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| api.httpRoute.annotations | object | `{}` | Additional HTTPRoute annotations. |
| api.httpRoute.enabled | bool | `false` | Enable an HTTPRoute resource for this service. |
| api.httpRoute.hostnames | list | `[]` | Hostnames for the HTTPRoute to match. |
| api.httpRoute.labels | object | `{}` | Additional HTTPRoute labels. |
| api.httpRoute.parentRefs | list | `[]` | Parent references (Gateways) to attach the HTTPRoute to. |
| api.httpRoute.rules | list | `[]` | Routing rules for the HTTPRoute. |

#### Image

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| api.image.pullPolicy | string | `"IfNotPresent"` | Image pull policy for the app. |
| api.image.registry | string | `"ghcr.io"` | Registry to use for the app. |
| api.image.repository | string | `"this-is-tobi/template-monorepo-ts"` | Repository to use for the app. |
| api.image.tag | string | `""` | Tag to use for the app. Overrides the image tag whose default is the chart appVersion. |

#### Ingress

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| api.ingress.annotations | object | `{}` | Additional ingress annotations. |
| api.ingress.className | string | `""` | Defines which ingress controller will implement the resource. |
| api.ingress.enabled | bool | `false` | Whether or not ingress should be enabled. |
| api.ingress.hosts[0].backend.portNumber | string | `nil` | Port used by the backend service linked to the host record (leave null to use the app service port). |
| api.ingress.hosts[0].backend.serviceName | string | `""` | Name of the backend service linked to the host record (leave empty to use the app service). |
| api.ingress.hosts[0].name | string | `"domain.local"` | Name of the host record. |
| api.ingress.hosts[0].path | string | `"/"` | Path of the host record to manage routing. |
| api.ingress.hosts[0].pathType | string | `"Prefix"` | Path type of the host record. |
| api.ingress.labels | object | `{}` | Additional ingress labels. |
| api.ingress.tls | list | `[]` | Enable TLS configuration. |

#### Metrics

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| api.metrics.enabled | bool | `false` | Deploy metrics service. Injects `OTEL_METRICS_PORT` into the api container from `api.metrics.service.targetPort`, so the exporter, containerPort and Service cannot drift apart. |
| api.metrics.service.annotations | object | `{}` | Metrics service annotations. |
| api.metrics.service.labels | object | `{}` | Metrics service labels. |
| api.metrics.service.port | int | `9000` | Metrics service port. |
| api.metrics.service.targetPort | int | `9000` | Metrics service target port. |
| api.metrics.serviceMonitor.annotations | object | `{}` | Prometheus ServiceMonitor annotations. |
| api.metrics.serviceMonitor.enabled | bool | `false` | Enable a prometheus ServiceMonitor. |
| api.metrics.serviceMonitor.endpoints[0].basicAuth.password | string | `""` | The secret in the service monitor namespace that contains the password for authentication. |
| api.metrics.serviceMonitor.endpoints[0].basicAuth.username | string | `""` | The secret in the service monitor namespace that contains the username for authentication. |
| api.metrics.serviceMonitor.endpoints[0].bearerTokenSecret.key | string | `""` | Secret key to mount to read bearer token for scraping targets. The secret needs to be in the same namespace as the service monitor and accessible by the Prometheus Operator. |
| api.metrics.serviceMonitor.endpoints[0].bearerTokenSecret.name | string | `""` | Secret name to mount to read bearer token for scraping targets. The secret needs to be in the same namespace as the service monitor and accessible by the Prometheus Operator. |
| api.metrics.serviceMonitor.endpoints[0].honorLabels | bool | `false` | When true, honorLabels preserves the metric’s labels when they collide with the target’s labels. |
| api.metrics.serviceMonitor.endpoints[0].interval | string | `"30s"` | Prometheus ServiceMonitor interval. |
| api.metrics.serviceMonitor.endpoints[0].metricRelabelings | list | `[]` | Prometheus MetricRelabelConfigs to apply to samples before ingestion. |
| api.metrics.serviceMonitor.endpoints[0].path | string | `"/metrics"` | Path used by the Prometheus ServiceMonitor to scrape metrics. |
| api.metrics.serviceMonitor.endpoints[0].relabelings | list | `[]` | Prometheus RelabelConfigs to apply to samples before scraping. |
| api.metrics.serviceMonitor.endpoints[0].scheme | string | `""` | Prometheus ServiceMonitor scheme. |
| api.metrics.serviceMonitor.endpoints[0].scrapeTimeout | string | `"10s"` | Prometheus ServiceMonitor scrapeTimeout. If empty, Prometheus uses the global scrape timeout unless it is less than the target's scrape interval value in which the latter is used. |
| api.metrics.serviceMonitor.endpoints[0].selector | object | `{}` | Prometheus ServiceMonitor selector. |
| api.metrics.serviceMonitor.endpoints[0].tlsConfig | object | `{}` | Prometheus ServiceMonitor tlsConfig. |
| api.metrics.serviceMonitor.labels | object | `{}` | Prometheus ServiceMonitor labels. |

#### Migrate

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| api.migrate.enabled | bool | `true` | Whether or not to add a migration init container to the api pod. |
| api.migrate.registry | string | `"ghcr.io"` | Registry to use for the migration init container image. |
| api.migrate.repository | string | `"this-is-tobi/template-monorepo-ts"` | Repository to use for the migration init container image. |
| api.migrate.tag | string | `""` | Tag to use for the migration init container image. Overrides the image tag whose default is the chart appVersion. |

#### NetworkPolicy

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| api.networkPolicy.create | bool | `false` | Create NetworkPolicy object for the app. |
| api.networkPolicy.egress | list | `[]` | Egress rules for the NetworkPolicy object. |
| api.networkPolicy.ingress | list | `[]` | Ingress rules for the NetworkPolicy object. |
| api.networkPolicy.policyTypes | list | `["Ingress"]` | Policy types used in the NetworkPolicy object. |

#### Pdb

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| api.pdb.annotations | object | `{}` | Annotations to be added to app pdb. |
| api.pdb.enabled | bool | `false` | Deploy a PodDisruptionBudget for the app |
| api.pdb.labels | object | `{}` | Labels to be added to app pdb. |
| api.pdb.maxUnavailable | string | `""` | Number of pods that are unavailable after eviction as number or percentage (eg.: 50%). Has higher precedence over `api.pdb.minAvailable`. |
| api.pdb.minAvailable | string | `""` (defaults to 0 if not specified) | Number of pods that are available after eviction as number or percentage (eg.: 50%). |

#### Probes

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| api.probes.livenessProbe.failureThreshold | int | `3` | Minimum consecutive failures for the probe to be considered failed after having succeeded. |
| api.probes.livenessProbe.httpGet.path | string | `"/api/v1/livez"` | Api container healthcheck endpoint (livenessProbe is defined using `toYaml` so it is possible to override it completely). |
| api.probes.livenessProbe.httpGet.port | string | `"http"` | Port to use for healthcheck (defaults to container port). |
| api.probes.livenessProbe.initialDelaySeconds | int | `30` | Number of seconds after the container has started before probe is initiated. |
| api.probes.livenessProbe.periodSeconds | int | `30` | How often (in seconds) to perform the probe. |
| api.probes.livenessProbe.successThreshold | int | `1` | Minimum consecutive successes for the probe to be considered successful after having failed. |
| api.probes.livenessProbe.timeoutSeconds | int | `5` | Number of seconds after which the probe times out. |
| api.probes.readinessProbe.failureThreshold | int | `2` | Minimum consecutive failures for the probe to be considered failed after having succeeded. |
| api.probes.readinessProbe.httpGet.path | string | `"/api/v1/readyz"` | Api container healthcheck endpoint (readinessProbe is defined using `toYaml` so it is possible to override it completely). |
| api.probes.readinessProbe.httpGet.port | string | `"http"` | Port to use for healthcheck (defaults to container port). |
| api.probes.readinessProbe.initialDelaySeconds | int | `10` | Number of seconds after the container has started before probe is initiated. |
| api.probes.readinessProbe.periodSeconds | int | `10` | How often (in seconds) to perform the probe. |
| api.probes.readinessProbe.successThreshold | int | `2` | Minimum consecutive successes for the probe to be considered successful after having failed. |
| api.probes.readinessProbe.timeoutSeconds | int | `5` | Number of seconds after which the probe times out. |
| api.probes.startupProbe.failureThreshold | int | `10` | Minimum consecutive failures for the probe to be considered failed after having succeeded. |
| api.probes.startupProbe.httpGet.path | string | `"/api/v1/healthz"` | Api container healthcheck endpoint (startupProbe is defined using `toYaml` so it is possible to override it completely). |
| api.probes.startupProbe.httpGet.port | string | `"http"` | Port to use for healthcheck (defaults to container port). |
| api.probes.startupProbe.initialDelaySeconds | int | `0` | Number of seconds after the container has started before probe is initiated. |
| api.probes.startupProbe.periodSeconds | int | `10` | How often (in seconds) to perform the probe. |
| api.probes.startupProbe.successThreshold | int | `1` | Minimum consecutive successes for the probe to be considered successful after having failed. |
| api.probes.startupProbe.timeoutSeconds | int | `5` | Number of seconds after which the probe times out. |

#### Resources

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| api.resources.limits.cpu | string | `"500m"` | CPU limit for the app. |
| api.resources.limits.memory | string | `"2Gi"` | Memory limit for the app. |
| api.resources.requests.cpu | string | `"100m"` | CPU request for the app. |
| api.resources.requests.memory | string | `"256Mi"` | Memory request for the app. |

#### Service

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| api.service.extraPorts | list | `[]` | Extra service ports. |
| api.service.nodePort | int | `31000` | Port used when type is `NodePort` to expose the service on the given node port. |
| api.service.port | int | `80` | Port used by the service. |
| api.service.portName | string | `"http"` | Port name used by the service. |
| api.service.protocol | string | `"TCP"` | Protocol used by the service. |
| api.service.type | string | `"ClusterIP"` | Type of service to create for the app. |

#### ServiceAccount

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| api.serviceAccount.annotations | object | `{}` | Annotations applied to created service account. |
| api.serviceAccount.automountServiceAccountToken | bool | `false` | Should the service account access token be automount in the pod. |
| api.serviceAccount.clusterRole.create | bool | `false` | Should the clusterRole be created. |
| api.serviceAccount.clusterRole.rules | list | `[]` | ClusterRole rules associated with the service account. |
| api.serviceAccount.create | bool | `false` | Create a service account. |
| api.serviceAccount.enabled | bool | `false` | Enable the service account. |
| api.serviceAccount.name | string | `""` | Service account name. |
| api.serviceAccount.role.create | bool | `false` | Should the role be created. |
| api.serviceAccount.role.rules | list | `[]` | Role rules associated with the service account. |

#### Strategy

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| api.strategy.rollingUpdate.maxSurge | int | `1` | The maximum number of pods that can be scheduled above the desired number of pods. |
| api.strategy.rollingUpdate.maxUnavailable | int | `1` | The maximum number of pods that can be unavailable during the update process. |
| api.strategy.type | string | `"RollingUpdate"` | Strategy type used to replace old Pods by new ones, can be `Recreate` or `RollingUpdate`. |

### CnpgKeycloak

#### General

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| cnpg-keycloak.enabled | bool | `false` | Enable the cluster dependency for Keycloak. |

#### Cluster

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| cnpg-keycloak.cluster.imageName | string | `"ghcr.io/cloudnative-pg/postgresql:18.6"` | CNPG PostgreSQL image. |
| cnpg-keycloak.cluster.initdb.database | string | `"keycloak"` | Name of the Keycloak database. |
| cnpg-keycloak.cluster.initdb.owner | string | `"keycloak"` | Owner of the Keycloak database, the user Keycloak connects as. |
| cnpg-keycloak.cluster.instances | int | `3` | Number of PostgreSQL instances. |
| cnpg-keycloak.cluster.monitoring.instrumentation.logicalReplication | bool | `false` |  |

### Cnpg

#### General

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| cnpg.enabled | bool | `false` | Enable the cluster dependency. |

#### Backups

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| cnpg.backups.enabled | bool | `false` | Enable scheduled S3 backups. |

#### Cluster

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| cnpg.cluster.affinity | object | `{"topologyKey":"topology.kubernetes.io/zone"}` | Topology key used for pod anti-affinity (spread instances across zones). |
| cnpg.cluster.imageName | string | `"ghcr.io/cloudnative-pg/postgresql:18.6"` | CNPG PostgreSQL image. |
| cnpg.cluster.initdb.database | string | `"app"` | Name of the application database. |
| cnpg.cluster.initdb.owner | string | `"app"` | Owner of the application database, the user the application connects as. |
| cnpg.cluster.instances | int | `3` | Number of PostgreSQL instances (1 for dev, 3 for HA prod). |
| cnpg.cluster.monitoring.enabled | bool | `false` | Create the PodMonitor for Prometheus Operator scraping. |
| cnpg.cluster.storage.size | string | `"3Gi"` | Size of the data PVC per instance. |
| cnpg.cluster.walStorage.enabled | bool | `true` | Store the WAL in its own PVC (false keeps it in the data PVC). |
| cnpg.cluster.walStorage.size | string | `"2Gi"` | Size of the WAL PVC per instance. |

### Docs

#### General

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| docs.affinity | object | `{}` | Affinity used for app pod. |
| docs.args | list | `[]` | Docs container command args. |
| docs.command | list | `[]` | Docs container command. |
| docs.containerPort | int | `8080` | Docs container port number. |
| docs.containerPortName | string | `"http"` | Docs container port name. |
| docs.env | object | `{}` | Map or array of environment variables to inject into the app container (`valueFrom` supported). |
| docs.envCm | object | `{}` | Map of environment variables to inject into a configmap loaded by the app container (`valueFrom` not supported). |
| docs.envFrom | list | `[]` | Docs container env variables loaded from configmap or secret reference. |
| docs.envSecret | object | `{}` | Map of environment variables to inject into a secret loaded by the app container (`valueFrom` not supported). |
| docs.extraContainers | list | `[]` | Extra containers to add to the app pod as sidecars. |
| docs.extraPorts | list | `[]` | Docs extra container ports. |
| docs.hostAliases | list | `[]` | Host aliases that will be injected at pod-level into /etc/hosts. |
| docs.imagePullSecrets | list | `[]` | Image credentials configuration. |
| docs.initContainers | list | `[]` | Init containers to add to the app pod. |
| docs.nodeSelector | object | `{}` | Default node selector for app. |
| docs.podAnnotations | object | `{}` | Annotations for the app deployed pods. |
| docs.podLabels | object | `{}` | Labels for the app deployed pods. |
| docs.podSecurityContext | object | `{}` | Toggle and define pod-level security context. |
| docs.replicaCount | int | `1` | The number of application controller pods to run. |
| docs.revisionHistoryLimit | int | `10` | Revision history limit for the app. |
| docs.securityContext | object | `{"allowPrivilegeEscalation":false,"capabilities":{"drop":["ALL"]},"readOnlyRootFilesystem":true,"runAsNonRoot":true,"seccompProfile":{"type":"RuntimeDefault"}}` | Toggle and define container-level security context. |
| docs.statefulset | bool | `false` | Should the app run as a StatefulSet instead of a Deployment. |
| docs.tolerations | list | `[]` | Default tolerations for app. |
| docs.volumeClaims | list | `[]` | List of volumeClaims to add. |
| docs.volumeMounts | list | `[]` | List of mounts to add (normally used with `volumes` or `volumeClaims`). |
| docs.volumes | list | `[]` | List of volumes to add. |

#### Autoscaling

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| docs.autoscaling.enabled | bool | `false` | Enable Horizontal Pod Autoscaler for the app. |
| docs.autoscaling.maxReplicas | int | `3` | Maximum number of replicas for the app. |
| docs.autoscaling.minReplicas | int | `1` | Minimum number of replicas for the app. |
| docs.autoscaling.targetCPUUtilizationPercentage | int | `80` | Average CPU utilization percentage for the app. |
| docs.autoscaling.targetMemoryUtilizationPercentage | int | `80` | Average memory utilization percentage for the app. |

#### GrpcRoute

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| docs.grpcRoute.annotations | object | `{}` | Additional GRPCRoute annotations. |
| docs.grpcRoute.enabled | bool | `false` | Enable a GRPCRoute resource for this service. |
| docs.grpcRoute.hostnames | list | `[]` | Hostnames for the GRPCRoute to match. |
| docs.grpcRoute.labels | object | `{}` | Additional GRPCRoute labels. |
| docs.grpcRoute.parentRefs | list | `[]` | Parent references (Gateways) to attach the GRPCRoute to. |
| docs.grpcRoute.rules | list | `[]` | Routing rules for the GRPCRoute. |

#### HttpRoute

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| docs.httpRoute.annotations | object | `{}` | Additional HTTPRoute annotations. |
| docs.httpRoute.enabled | bool | `false` | Enable an HTTPRoute resource for this service. |
| docs.httpRoute.hostnames | list | `[]` | Hostnames for the HTTPRoute to match. |
| docs.httpRoute.labels | object | `{}` | Additional HTTPRoute labels. |
| docs.httpRoute.parentRefs | list | `[]` | Parent references (Gateways) to attach the HTTPRoute to. |
| docs.httpRoute.rules | list | `[]` | Routing rules for the HTTPRoute. |

#### Image

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| docs.image.pullPolicy | string | `"IfNotPresent"` | Image pull policy for the app. |
| docs.image.registry | string | `"ghcr.io"` | Registry to use for the app. |
| docs.image.repository | string | `"this-is-tobi/template-monorepo-ts"` | Repository to use for the app. |
| docs.image.tag | string | `""` | Tag to use for the app. Overrides the image tag whose default is the chart appVersion. |

#### Ingress

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| docs.ingress.annotations | object | `{}` | Additional ingress annotations. |
| docs.ingress.className | string | `""` | Defines which ingress controller will implement the resource. |
| docs.ingress.enabled | bool | `false` | Whether or not ingress should be enabled. |
| docs.ingress.hosts[0].backend.portNumber | string | `nil` | Port used by the backend service linked to the host record (leave null to use the app service port). |
| docs.ingress.hosts[0].backend.serviceName | string | `""` | Name of the backend service linked to the host record (leave empty to use the app service). |
| docs.ingress.hosts[0].name | string | `"domain.local"` | Name of the host record. |
| docs.ingress.hosts[0].path | string | `"/"` | Path of the host record to manage routing. |
| docs.ingress.hosts[0].pathType | string | `"Prefix"` | Path type of the host record. |
| docs.ingress.labels | object | `{}` | Additional ingress labels. |
| docs.ingress.tls | list | `[]` | Enable TLS configuration. |

#### Metrics

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| docs.metrics.enabled | bool | `false` | Deploy metrics service. |
| docs.metrics.service.annotations | object | `{}` | Metrics service annotations. |
| docs.metrics.service.labels | object | `{}` | Metrics service labels. |
| docs.metrics.service.port | int | `9000` | Metrics service port. |
| docs.metrics.service.targetPort | int | `9000` | Metrics service target port. |
| docs.metrics.serviceMonitor.annotations | object | `{}` | Prometheus ServiceMonitor annotations. |
| docs.metrics.serviceMonitor.enabled | bool | `false` | Enable a prometheus ServiceMonitor. |
| docs.metrics.serviceMonitor.endpoints[0].basicAuth.password | string | `""` | The secret in the service monitor namespace that contains the password for authentication. |
| docs.metrics.serviceMonitor.endpoints[0].basicAuth.username | string | `""` | The secret in the service monitor namespace that contains the username for authentication. |
| docs.metrics.serviceMonitor.endpoints[0].bearerTokenSecret.key | string | `""` | Secret key to mount to read bearer token for scraping targets. The secret needs to be in the same namespace as the service monitor and accessible by the Prometheus Operator. |
| docs.metrics.serviceMonitor.endpoints[0].bearerTokenSecret.name | string | `""` | Secret name to mount to read bearer token for scraping targets. The secret needs to be in the same namespace as the service monitor and accessible by the Prometheus Operator. |
| docs.metrics.serviceMonitor.endpoints[0].honorLabels | bool | `false` | When true, honorLabels preserves the metric’s labels when they collide with the target’s labels. |
| docs.metrics.serviceMonitor.endpoints[0].interval | string | `"30s"` | Prometheus ServiceMonitor interval. |
| docs.metrics.serviceMonitor.endpoints[0].metricRelabelings | list | `[]` | Prometheus MetricRelabelConfigs to apply to samples before ingestion. |
| docs.metrics.serviceMonitor.endpoints[0].path | string | `"/metrics"` | Path used by the Prometheus ServiceMonitor to scrape metrics. |
| docs.metrics.serviceMonitor.endpoints[0].relabelings | list | `[]` | Prometheus RelabelConfigs to apply to samples before scraping. |
| docs.metrics.serviceMonitor.endpoints[0].scheme | string | `""` | Prometheus ServiceMonitor scheme. |
| docs.metrics.serviceMonitor.endpoints[0].scrapeTimeout | string | `"10s"` | Prometheus ServiceMonitor scrapeTimeout. If empty, Prometheus uses the global scrape timeout unless it is less than the target's scrape interval value in which the latter is used. |
| docs.metrics.serviceMonitor.endpoints[0].selector | object | `{}` | Prometheus ServiceMonitor selector. |
| docs.metrics.serviceMonitor.endpoints[0].tlsConfig | object | `{}` | Prometheus ServiceMonitor tlsConfig. |
| docs.metrics.serviceMonitor.labels | object | `{}` | Prometheus ServiceMonitor labels. |

#### NetworkPolicy

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| docs.networkPolicy.create | bool | `false` | Create NetworkPolicy object for the app. |
| docs.networkPolicy.egress | list | `[]` | Egress rules for the NetworkPolicy object. |
| docs.networkPolicy.ingress | list | `[]` | Ingress rules for the NetworkPolicy object. |
| docs.networkPolicy.policyTypes | list | `["Ingress"]` | Policy types used in the NetworkPolicy object. |

#### Pdb

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| docs.pdb.annotations | object | `{}` | Annotations to be added to app pdb. |
| docs.pdb.enabled | bool | `false` | Deploy a PodDisruptionBudget for the app |
| docs.pdb.labels | object | `{}` | Labels to be added to app pdb. |
| docs.pdb.maxUnavailable | string | `""` | Number of pods that are unavailable after eviction as number or percentage (eg.: 50%). Has higher precedence over `docs.pdb.minAvailable`. |
| docs.pdb.minAvailable | string | `""` (defaults to 0 if not specified) | Number of pods that are available after eviction as number or percentage (eg.: 50%). |

#### Probes

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| docs.probes.livenessProbe.failureThreshold | int | `3` | Minimum consecutive failures for the probe to be considered failed after having succeeded. |
| docs.probes.livenessProbe.httpGet.path | string | `"/healthz"` | Docs container healthcheck endpoint (livenessProbe is defined using `toYaml` so it is possible to override it completely). |
| docs.probes.livenessProbe.httpGet.port | string | `"http"` | Port to use for healthcheck (defaults to container port). |
| docs.probes.livenessProbe.initialDelaySeconds | int | `30` | Number of seconds after the container has started before probe is initiated. |
| docs.probes.livenessProbe.periodSeconds | int | `30` | How often (in seconds) to perform the probe. |
| docs.probes.livenessProbe.successThreshold | int | `1` | Minimum consecutive successes for the probe to be considered successful after having failed. |
| docs.probes.livenessProbe.timeoutSeconds | int | `5` | Number of seconds after which the probe times out. |
| docs.probes.readinessProbe.failureThreshold | int | `2` | Minimum consecutive failures for the probe to be considered failed after having succeeded. |
| docs.probes.readinessProbe.httpGet.path | string | `"/healthz"` | Docs container healthcheck endpoint (readinessProbe is defined using `toYaml` so it is possible to override it completely). |
| docs.probes.readinessProbe.httpGet.port | string | `"http"` | Port to use for healthcheck (defaults to container port). |
| docs.probes.readinessProbe.initialDelaySeconds | int | `10` | Number of seconds after the container has started before probe is initiated. |
| docs.probes.readinessProbe.periodSeconds | int | `10` | How often (in seconds) to perform the probe. |
| docs.probes.readinessProbe.successThreshold | int | `2` | Minimum consecutive successes for the probe to be considered successful after having failed. |
| docs.probes.readinessProbe.timeoutSeconds | int | `5` | Number of seconds after which the probe times out. |
| docs.probes.startupProbe.failureThreshold | int | `10` | Minimum consecutive failures for the probe to be considered failed after having succeeded. |
| docs.probes.startupProbe.httpGet.path | string | `"/healthz"` | Docs container healthcheck endpoint (startupProbe is defined using `toYaml` so it is possible to override it completely). |
| docs.probes.startupProbe.httpGet.port | string | `"http"` | Port to use for healthcheck (defaults to container port). |
| docs.probes.startupProbe.initialDelaySeconds | int | `0` | Number of seconds after the container has started before probe is initiated. |
| docs.probes.startupProbe.periodSeconds | int | `10` | How often (in seconds) to perform the probe. |
| docs.probes.startupProbe.successThreshold | int | `1` | Minimum consecutive successes for the probe to be considered successful after having failed. |
| docs.probes.startupProbe.timeoutSeconds | int | `5` | Number of seconds after which the probe times out. |

#### Resources

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| docs.resources.limits.cpu | string | `"500m"` | CPU limit for the app. |
| docs.resources.limits.memory | string | `"2Gi"` | Memory limit for the app. |
| docs.resources.requests.cpu | string | `"100m"` | CPU request for the app. |
| docs.resources.requests.memory | string | `"256Mi"` | Memory request for the app. |

#### Service

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| docs.service.extraPorts | list | `[]` | Extra service ports. |
| docs.service.nodePort | int | `31000` | Port used when type is `NodePort` to expose the service on the given node port. |
| docs.service.port | int | `80` | Port used by the service. |
| docs.service.portName | string | `"http"` | Port name used by the service. |
| docs.service.protocol | string | `"TCP"` | Protocol used by the service. |
| docs.service.type | string | `"ClusterIP"` | Type of service to create for the app. |

#### ServiceAccount

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| docs.serviceAccount.annotations | object | `{}` | Annotations applied to created service account. |
| docs.serviceAccount.automountServiceAccountToken | bool | `false` | Should the service account access token be automount in the pod. |
| docs.serviceAccount.clusterRole.create | bool | `false` | Should the clusterRole be created. |
| docs.serviceAccount.clusterRole.rules | list | `[]` | ClusterRole rules associated with the service account. |
| docs.serviceAccount.create | bool | `false` | Create a service account. |
| docs.serviceAccount.enabled | bool | `false` | Enable the service account. |
| docs.serviceAccount.name | string | `""` | Service account name. |
| docs.serviceAccount.role.create | bool | `false` | Should the role be created. |
| docs.serviceAccount.role.rules | list | `[]` | Role rules associated with the service account. |

#### Strategy

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| docs.strategy.rollingUpdate.maxSurge | int | `1` | The maximum number of pods that can be scheduled above the desired number of pods. |
| docs.strategy.rollingUpdate.maxUnavailable | int | `1` | The maximum number of pods that can be unavailable during the update process. |
| docs.strategy.type | string | `"RollingUpdate"` | Strategy type used to replace old Pods by new ones, can be `Recreate` or `RollingUpdate`. |

### Gateway

#### General

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| gateway.addresses | list | `[]` | Gateway addresses configuration. |
| gateway.annotations | object | `{}` | Additional gateway annotations. |
| gateway.className | string | `""` | GatewayClass name. Required when creating a Gateway. |
| gateway.create | bool | `false` | Create a Gateway resource. Usually, you reference an existing Gateway managed by the infrastructure team. |
| gateway.labels | object | `{}` | Additional gateway labels. |
| gateway.listeners | list | `[]` | Gateway listeners configuration. |
| gateway.name | string | `""` | Name of the Gateway resource. If not set, uses the release fullname. |

### Keycloak

#### General

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| keycloak.enabled | bool | `false` | Enable the keycloak dependency. |
| keycloak.extraObjects | list | `[]` | Extra NetworkPolicy or other objects deployed alongside Keycloak. |
| keycloak.replicaCount | int | `1` |  |

#### ContainerSecurityContext

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| keycloak.containerSecurityContext.allowPrivilegeEscalation | bool | `false` |  |
| keycloak.containerSecurityContext.capabilities.drop[0] | string | `"ALL"` |  |
| keycloak.containerSecurityContext.readOnlyRootFilesystem | bool | `false` |  |
| keycloak.containerSecurityContext.runAsGroup | int | `1001` |  |
| keycloak.containerSecurityContext.runAsNonRoot | bool | `true` |  |
| keycloak.containerSecurityContext.runAsUser | int | `1001` |  |

#### Database

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| keycloak.database.type | string | `"postgres"` |  |

#### Keycloak

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| keycloak.keycloak.adminPassword | string | `""` | Keycloak admin password (auto-generated when empty). |
| keycloak.keycloak.adminUser | string | `"admin"` | Keycloak admin username. |
| keycloak.keycloak.hostname | string | `""` | Keycloak public hostname (required for production mode). |
| keycloak.keycloak.httpEnabled | bool | `true` |  |
| keycloak.keycloak.production | bool | `false` | Enable Keycloak production hardening (disables HTTP, enforces strict TLS). |
| keycloak.keycloak.proxyHeaders | string | `"xforwarded"` | Proxy header mode: forwarded or xforwarded. |

#### Metrics

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| keycloak.metrics.enabled | bool | `false` | Enable Keycloak metrics endpoint. |

#### Pdb

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| keycloak.pdb.enabled | bool | `false` | Enable PodDisruptionBudget for Keycloak. |

#### PodSecurityContext

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| keycloak.podSecurityContext.fsGroup | int | `1001` |  |

#### Postgres

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| keycloak.postgres.auth.database | string | `"keycloak"` |  |
| keycloak.postgres.auth.password | string | `""` |  |
| keycloak.postgres.auth.username | string | `"keycloak"` |  |
| keycloak.postgres.enabled | bool | `true` |  |

#### Resources

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| keycloak.resources.limits.cpu | string | `"500m"` |  |
| keycloak.resources.limits.memory | string | `"1Gi"` |  |
| keycloak.resources.requests.cpu | string | `"250m"` |  |
| keycloak.resources.requests.memory | string | `"512Mi"` |  |

#### ServiceAccount

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| keycloak.serviceAccount.automountServiceAccountToken | bool | `false` |  |
| keycloak.serviceAccount.create | bool | `false` |  |

### KubePrometheusStack

#### General

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| kube-prometheus-stack.enabled | bool | `false` | Enable the kube-prometheus-stack dependency. |

#### Alertmanager

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| kube-prometheus-stack.alertmanager.enabled | bool | `false` | Enable AlertManager. |

#### Grafana

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| kube-prometheus-stack.grafana.adminPassword | string | `""` | Grafana admin password (auto-generated when empty). |
| kube-prometheus-stack.grafana.enabled | bool | `true` | Enable embedded Grafana deployment. |

#### Prometheus

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| kube-prometheus-stack.prometheus.prometheusSpec.retention | string | `"15d"` | Prometheus metrics retention period. |

### Mcp

#### General

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| mcp.affinity | object | `{}` | Affinity used for app pod. |
| mcp.args | list | `[]` | Mcp container command args. |
| mcp.command | list | `[]` | Mcp container command. |
| mcp.containerPort | int | `3100` | Mcp container port number. |
| mcp.containerPortName | string | `"http"` | Mcp container port name. |
| mcp.enabled | bool | `true` | Enable the MCP server deployment. When false, no MCP resources are created. |
| mcp.env | object | `{}` | Map or array of environment variables to inject into the mcp container (`valueFrom` supported). |
| mcp.envCm | object | `{}` | Map of environment variables to inject into a configmap loaded by the mcp container (`valueFrom` not supported). |
| mcp.envFrom | list | `[]` | Mcp container env variables loaded from configmap or secret reference. |
| mcp.envSecret | object | `{}` | Map of environment variables to inject into a secret loaded by the mcp container (`valueFrom` not supported). |
| mcp.extraContainers | list | `[]` | Extra containers to add to the app pod as sidecars. |
| mcp.extraPorts | list | `[]` | Mcp extra container ports. |
| mcp.hostAliases | list | `[]` | Host aliases that will be injected at pod-level into /etc/hosts. |
| mcp.imagePullSecrets | list | `[]` | Image credentials configuration. |
| mcp.initContainers | list | `[]` | Init containers to add to the app pod. |
| mcp.nodeSelector | object | `{}` | Default node selector for app. |
| mcp.podAnnotations | object | `{}` | Annotations for the app deployed pods. |
| mcp.podLabels | object | `{}` | Labels for the app deployed pods. |
| mcp.podSecurityContext | object | `{}` | Toggle and define pod-level security context. |
| mcp.replicaCount | int | `1` | The number of application controller pods to run. |
| mcp.revisionHistoryLimit | int | `10` | Revision history limit for the app. |
| mcp.securityContext | object | `{"allowPrivilegeEscalation":false,"capabilities":{"drop":["ALL"]},"readOnlyRootFilesystem":true,"runAsNonRoot":true,"seccompProfile":{"type":"RuntimeDefault"}}` | Toggle and define container-level security context. |
| mcp.statefulset | bool | `false` | Should the app run as a StatefulSet instead of a Deployment. |
| mcp.tolerations | list | `[]` | Default tolerations for app. |
| mcp.volumeClaims | list | `[]` | List of volumeClaims to add. |
| mcp.volumeMounts | list | `[]` | List of mounts to add (normally used with `volumes` or `volumeClaims`). |
| mcp.volumes | list | `[]` | List of volumes to add. |

#### Autoscaling

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| mcp.autoscaling.enabled | bool | `false` | Enable Horizontal Pod Autoscaler for the app. |
| mcp.autoscaling.maxReplicas | int | `3` | Maximum number of replicas for the app. |
| mcp.autoscaling.minReplicas | int | `1` | Minimum number of replicas for the app. |
| mcp.autoscaling.targetCPUUtilizationPercentage | int | `80` | Average CPU utilization percentage for the app. |
| mcp.autoscaling.targetMemoryUtilizationPercentage | int | `80` | Average memory utilization percentage for the app. |

#### HttpRoute

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| mcp.httpRoute.annotations | object | `{}` | Additional HTTPRoute annotations. |
| mcp.httpRoute.enabled | bool | `false` | Enable an HTTPRoute resource for this service. |
| mcp.httpRoute.hostnames | list | `[]` | Hostnames for the HTTPRoute to match. |
| mcp.httpRoute.labels | object | `{}` | Additional HTTPRoute labels. |
| mcp.httpRoute.parentRefs | list | `[]` | Parent references (Gateways) to attach the HTTPRoute to. |
| mcp.httpRoute.rules | list | `[]` | Routing rules for the HTTPRoute. |

#### Image

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| mcp.image.pullPolicy | string | `"IfNotPresent"` | Image pull policy for the app. |
| mcp.image.registry | string | `"ghcr.io"` | Registry to use for the app. |
| mcp.image.repository | string | `"this-is-tobi/template-monorepo-ts"` | Repository to use for the app. |
| mcp.image.tag | string | `""` | Tag to use for the app. Overrides the image tag whose default is the chart appVersion. |

#### Ingress

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| mcp.ingress.annotations | object | `{}` | Additional ingress annotations. |
| mcp.ingress.className | string | `""` | Defines which ingress controller will implement the resource. |
| mcp.ingress.enabled | bool | `false` | Whether or not ingress should be enabled. |
| mcp.ingress.hosts[0].backend.portNumber | string | `nil` | Port used by the backend service linked to the host record (leave null to use the app service port). |
| mcp.ingress.hosts[0].backend.serviceName | string | `""` | Name of the backend service linked to the host record (leave empty to use the app service). |
| mcp.ingress.hosts[0].name | string | `"domain.local"` | Name of the host record. |
| mcp.ingress.hosts[0].path | string | `"/"` | Path of the host record to manage routing. |
| mcp.ingress.hosts[0].pathType | string | `"Prefix"` | Path type of the host record. |
| mcp.ingress.labels | object | `{}` | Additional ingress labels. |
| mcp.ingress.tls | list | `[]` | Enable TLS configuration. |

#### Metrics

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| mcp.metrics.enabled | bool | `false` | Deploy metrics service. |
| mcp.metrics.service.annotations | object | `{}` | Metrics service annotations. |
| mcp.metrics.service.labels | object | `{}` | Metrics service labels. |
| mcp.metrics.service.port | int | `9000` | Metrics service port. |
| mcp.metrics.service.targetPort | int | `9000` | Metrics service target port. |
| mcp.metrics.serviceMonitor.annotations | object | `{}` | Prometheus ServiceMonitor annotations. |
| mcp.metrics.serviceMonitor.enabled | bool | `false` | Enable a prometheus ServiceMonitor. |
| mcp.metrics.serviceMonitor.endpoints[0].basicAuth.password | string | `""` | The secret in the service monitor namespace that contains the password for authentication. |
| mcp.metrics.serviceMonitor.endpoints[0].basicAuth.username | string | `""` | The secret in the service monitor namespace that contains the username for authentication. |
| mcp.metrics.serviceMonitor.endpoints[0].bearerTokenSecret.key | string | `""` | Secret key to mount to read bearer token for scraping targets. The secret needs to be in the same namespace as the service monitor and accessible by the Prometheus Operator. |
| mcp.metrics.serviceMonitor.endpoints[0].bearerTokenSecret.name | string | `""` | Secret name to mount to read bearer token for scraping targets. The secret needs to be in the same namespace as the service monitor and accessible by the Prometheus Operator. |
| mcp.metrics.serviceMonitor.endpoints[0].honorLabels | bool | `false` | When true, honorLabels preserves the metric's labels when they collide with the target's labels. |
| mcp.metrics.serviceMonitor.endpoints[0].interval | string | `"30s"` | Prometheus ServiceMonitor interval. |
| mcp.metrics.serviceMonitor.endpoints[0].metricRelabelings | list | `[]` | Prometheus MetricRelabelConfigs to apply to samples before ingestion. |
| mcp.metrics.serviceMonitor.endpoints[0].path | string | `"/metrics"` | Path used by the Prometheus ServiceMonitor to scrape metrics. |
| mcp.metrics.serviceMonitor.endpoints[0].relabelings | list | `[]` | Prometheus RelabelConfigs to apply to samples before scraping. |
| mcp.metrics.serviceMonitor.endpoints[0].scheme | string | `""` | Prometheus ServiceMonitor scheme. |
| mcp.metrics.serviceMonitor.endpoints[0].scrapeTimeout | string | `"10s"` | Prometheus ServiceMonitor scrapeTimeout. If empty, Prometheus uses the global scrape timeout unless it is less than the target's scrape interval value in which the latter is used. |
| mcp.metrics.serviceMonitor.endpoints[0].selector | object | `{}` | Prometheus ServiceMonitor selector. |
| mcp.metrics.serviceMonitor.endpoints[0].tlsConfig | object | `{}` | Prometheus ServiceMonitor tlsConfig. |
| mcp.metrics.serviceMonitor.labels | object | `{}` | Prometheus ServiceMonitor labels. |

#### NetworkPolicy

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| mcp.networkPolicy.create | bool | `false` | Create NetworkPolicy object for the app. |
| mcp.networkPolicy.egress | list | `[]` | Egress rules for the NetworkPolicy object. |
| mcp.networkPolicy.ingress | list | `[]` | Ingress rules for the NetworkPolicy object. |
| mcp.networkPolicy.policyTypes | list | `["Ingress"]` | Policy types used in the NetworkPolicy object. |

#### Pdb

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| mcp.pdb.annotations | object | `{}` | Annotations to be added to app pdb. |
| mcp.pdb.enabled | bool | `false` | Deploy a PodDisruptionBudget for the app |
| mcp.pdb.labels | object | `{}` | Labels to be added to app pdb. |
| mcp.pdb.maxUnavailable | string | `""` | Number of pods that are unavailable after eviction as number or percentage (eg.: 50%). Has higher precedence over `mcp.pdb.minAvailable`. |
| mcp.pdb.minAvailable | string | `""` (defaults to 0 if not specified) | Number of pods that are available after eviction as number or percentage (eg.: 50%). |

#### Probes

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| mcp.probes.livenessProbe.failureThreshold | int | `3` | Minimum consecutive failures for the probe to be considered failed after having succeeded. |
| mcp.probes.livenessProbe.httpGet.path | string | `"/healthz"` | Mcp container healthcheck endpoint (livenessProbe is defined using `toYaml` so it is possible to override it completely). |
| mcp.probes.livenessProbe.httpGet.port | string | `"http"` | Port to use for healthcheck (defaults to container port). |
| mcp.probes.livenessProbe.initialDelaySeconds | int | `30` | Number of seconds after the container has started before probe is initiated. |
| mcp.probes.livenessProbe.periodSeconds | int | `30` | How often (in seconds) to perform the probe. |
| mcp.probes.livenessProbe.successThreshold | int | `1` | Minimum consecutive successes for the probe to be considered successful after having failed. |
| mcp.probes.livenessProbe.timeoutSeconds | int | `5` | Number of seconds after which the probe times out. |
| mcp.probes.readinessProbe.failureThreshold | int | `2` | Minimum consecutive failures for the probe to be considered failed after having succeeded. |
| mcp.probes.readinessProbe.httpGet.path | string | `"/healthz"` | Mcp container healthcheck endpoint (readinessProbe is defined using `toYaml` so it is possible to override it completely). |
| mcp.probes.readinessProbe.httpGet.port | string | `"http"` | Port to use for healthcheck (defaults to container port). |
| mcp.probes.readinessProbe.initialDelaySeconds | int | `10` | Number of seconds after the container has started before probe is initiated. |
| mcp.probes.readinessProbe.periodSeconds | int | `10` | How often (in seconds) to perform the probe. |
| mcp.probes.readinessProbe.successThreshold | int | `2` | Minimum consecutive successes for the probe to be considered successful after having failed. |
| mcp.probes.readinessProbe.timeoutSeconds | int | `5` | Number of seconds after which the probe times out. |
| mcp.probes.startupProbe.failureThreshold | int | `10` | Minimum consecutive failures for the probe to be considered failed after having succeeded. |
| mcp.probes.startupProbe.httpGet.path | string | `"/healthz"` | Mcp container healthcheck endpoint (startupProbe is defined using `toYaml` so it is possible to override it completely). |
| mcp.probes.startupProbe.httpGet.port | string | `"http"` | Port to use for healthcheck (defaults to container port). |
| mcp.probes.startupProbe.initialDelaySeconds | int | `0` | Number of seconds after the container has started before probe is initiated. |
| mcp.probes.startupProbe.periodSeconds | int | `10` | How often (in seconds) to perform the probe. |
| mcp.probes.startupProbe.successThreshold | int | `1` | Minimum consecutive successes for the probe to be considered successful after having failed. |
| mcp.probes.startupProbe.timeoutSeconds | int | `5` | Number of seconds after which the probe times out. |

#### Resources

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| mcp.resources.limits.cpu | string | `"250m"` | CPU limit for the app. |
| mcp.resources.limits.memory | string | `"512Mi"` | Memory limit for the app. |
| mcp.resources.requests.cpu | string | `"50m"` | CPU request for the app. |
| mcp.resources.requests.memory | string | `"128Mi"` | Memory request for the app. |

#### Service

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| mcp.service.extraPorts | list | `[]` | Extra service ports. |
| mcp.service.nodePort | int | `31200` | Port used when type is `NodePort` to expose the service on the given node port. |
| mcp.service.port | int | `80` | Port used by the service. |
| mcp.service.portName | string | `"http"` | Port name used by the service. |
| mcp.service.protocol | string | `"TCP"` | Protocol used by the service. |
| mcp.service.type | string | `"ClusterIP"` | Type of service to create for the app. |

#### ServiceAccount

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| mcp.serviceAccount.annotations | object | `{}` | Annotations applied to created service account. |
| mcp.serviceAccount.automountServiceAccountToken | bool | `false` | Should the service account access token be automount in the pod. |
| mcp.serviceAccount.clusterRole.create | bool | `false` | Should the clusterRole be created. |
| mcp.serviceAccount.clusterRole.rules | list | `[]` | ClusterRole rules associated with the service account. |
| mcp.serviceAccount.create | bool | `false` | Create a service account. |
| mcp.serviceAccount.enabled | bool | `false` | Enable the service account. |
| mcp.serviceAccount.name | string | `""` | Service account name. |
| mcp.serviceAccount.role.create | bool | `false` | Should the role be created. |
| mcp.serviceAccount.role.rules | list | `[]` | Role rules associated with the service account. |

#### Strategy

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| mcp.strategy.rollingUpdate.maxSurge | int | `1` | The maximum number of pods that can be scheduled above the desired number of pods. |
| mcp.strategy.rollingUpdate.maxUnavailable | int | `1` | The maximum number of pods that can be unavailable during the update process. |
| mcp.strategy.type | string | `"RollingUpdate"` | Strategy type used to replace old Pods by new ones, can be `Recreate` or `RollingUpdate`. |

### OpentelemetryCollector

#### General

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| opentelemetry-collector.enabled | bool | `false` | Enable the OpenTelemetry Collector dependency. |
| opentelemetry-collector.fullnameOverride | string | `"opentelemetry-collector"` |  |
| opentelemetry-collector.mode | string | `"deployment"` |  |
| opentelemetry-collector.replicaCount | int | `1` |  |

#### Command

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| opentelemetry-collector.command.name | string | `"otelcol-contrib"` |  |

#### Config

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| opentelemetry-collector.config.connectors.spanmetrics.aggregation_temporality | string | `"AGGREGATION_TEMPORALITY_CUMULATIVE"` |  |
| opentelemetry-collector.config.connectors.spanmetrics.dimensions[0].name | string | `"http.route"` |  |
| opentelemetry-collector.config.connectors.spanmetrics.dimensions[1].name | string | `"http.request.method"` |  |
| opentelemetry-collector.config.connectors.spanmetrics.dimensions[2].name | string | `"http.response.status_code"` |  |
| opentelemetry-collector.config.connectors.spanmetrics.dimensions[3].name | string | `"db.system.name"` |  |
| opentelemetry-collector.config.connectors.spanmetrics.dimensions[4].name | string | `"model"` |  |
| opentelemetry-collector.config.connectors.spanmetrics.dimensions[5].name | string | `"method"` |  |
| opentelemetry-collector.config.connectors.spanmetrics.dimensions_cache_size | int | `1000` |  |
| opentelemetry-collector.config.connectors.spanmetrics.histogram.explicit.buckets[0] | float | `0.002` |  |
| opentelemetry-collector.config.connectors.spanmetrics.histogram.explicit.buckets[10] | int | `5` |  |
| opentelemetry-collector.config.connectors.spanmetrics.histogram.explicit.buckets[11] | int | `10` |  |
| opentelemetry-collector.config.connectors.spanmetrics.histogram.explicit.buckets[1] | float | `0.005` |  |
| opentelemetry-collector.config.connectors.spanmetrics.histogram.explicit.buckets[2] | float | `0.01` |  |
| opentelemetry-collector.config.connectors.spanmetrics.histogram.explicit.buckets[3] | float | `0.025` |  |
| opentelemetry-collector.config.connectors.spanmetrics.histogram.explicit.buckets[4] | float | `0.05` |  |
| opentelemetry-collector.config.connectors.spanmetrics.histogram.explicit.buckets[5] | float | `0.1` |  |
| opentelemetry-collector.config.connectors.spanmetrics.histogram.explicit.buckets[6] | float | `0.25` |  |
| opentelemetry-collector.config.connectors.spanmetrics.histogram.explicit.buckets[7] | float | `0.5` |  |
| opentelemetry-collector.config.connectors.spanmetrics.histogram.explicit.buckets[8] | int | `1` |  |
| opentelemetry-collector.config.connectors.spanmetrics.histogram.explicit.buckets[9] | float | `2.5` |  |
| opentelemetry-collector.config.exporters.otlp_http/tempo.endpoint | string | `"http://tempo:4318"` |  |
| opentelemetry-collector.config.exporters.prometheus.endpoint | string | `"0.0.0.0:8889"` |  |
| opentelemetry-collector.config.processors.batch.send_batch_size | int | `1024` |  |
| opentelemetry-collector.config.processors.batch.timeout | string | `"5s"` |  |
| opentelemetry-collector.config.receivers.otlp.protocols.grpc.endpoint | string | `"0.0.0.0:4317"` |  |
| opentelemetry-collector.config.receivers.otlp.protocols.http.endpoint | string | `"0.0.0.0:4318"` |  |
| opentelemetry-collector.config.service.pipelines.metrics.exporters[0] | string | `"prometheus"` |  |
| opentelemetry-collector.config.service.pipelines.metrics.processors[0] | string | `"batch"` |  |
| opentelemetry-collector.config.service.pipelines.metrics.receivers[0] | string | `"otlp"` |  |
| opentelemetry-collector.config.service.pipelines.metrics.receivers[1] | string | `"spanmetrics"` |  |
| opentelemetry-collector.config.service.pipelines.traces.exporters[0] | string | `"otlp_http/tempo"` |  |
| opentelemetry-collector.config.service.pipelines.traces.exporters[1] | string | `"spanmetrics"` |  |
| opentelemetry-collector.config.service.pipelines.traces.processors[0] | string | `"batch"` |  |
| opentelemetry-collector.config.service.pipelines.traces.receivers[0] | string | `"otlp"` |  |

#### Image

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| opentelemetry-collector.image.repository | string | `"ghcr.io/open-telemetry/opentelemetry-collector-releases/opentelemetry-collector-contrib"` |  |

#### Ports

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| opentelemetry-collector.ports.metrics.containerPort | int | `8889` |  |
| opentelemetry-collector.ports.metrics.enabled | bool | `true` |  |
| opentelemetry-collector.ports.metrics.protocol | string | `"TCP"` |  |
| opentelemetry-collector.ports.metrics.servicePort | int | `8889` |  |
| opentelemetry-collector.ports.otlp-http.containerPort | int | `4318` |  |
| opentelemetry-collector.ports.otlp-http.enabled | bool | `true` |  |
| opentelemetry-collector.ports.otlp-http.protocol | string | `"TCP"` |  |
| opentelemetry-collector.ports.otlp-http.servicePort | int | `4318` |  |
| opentelemetry-collector.ports.otlp.containerPort | int | `4317` |  |
| opentelemetry-collector.ports.otlp.enabled | bool | `true` |  |
| opentelemetry-collector.ports.otlp.protocol | string | `"TCP"` |  |
| opentelemetry-collector.ports.otlp.servicePort | int | `4317` |  |

#### Resources

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| opentelemetry-collector.resources.limits.cpu | string | `"250m"` |  |
| opentelemetry-collector.resources.limits.memory | string | `"256Mi"` |  |
| opentelemetry-collector.resources.requests.cpu | string | `"50m"` |  |
| opentelemetry-collector.resources.requests.memory | string | `"128Mi"` |  |

#### SecurityContext

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| opentelemetry-collector.securityContext.allowPrivilegeEscalation | bool | `false` |  |
| opentelemetry-collector.securityContext.capabilities.drop[0] | string | `"ALL"` |  |
| opentelemetry-collector.securityContext.readOnlyRootFilesystem | bool | `true` |  |
| opentelemetry-collector.securityContext.runAsGroup | int | `10001` |  |
| opentelemetry-collector.securityContext.runAsNonRoot | bool | `true` |  |
| opentelemetry-collector.securityContext.runAsUser | int | `10001` |  |
| opentelemetry-collector.securityContext.seccompProfile.type | string | `"RuntimeDefault"` |  |

#### ServiceMonitor

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| opentelemetry-collector.serviceMonitor.enabled | bool | `false` |  |

### Redis

#### General

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| redis.architecture | string | `"standalone"` | Redis deployment architecture: standalone, replication or cluster. |
| redis.enabled | bool | `false` | Enable the redis dependency. |
| redis.extraObjects | list | `[]` | Extra NetworkPolicy or other objects deployed alongside Redis. |

#### Auth

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| redis.auth.enabled | bool | `true` | Enable Redis password authentication. |
| redis.auth.password | string | `""` | Redis password (auto-generated when empty). |

#### ContainerSecurityContext

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| redis.containerSecurityContext.allowPrivilegeEscalation | bool | `false` |  |
| redis.containerSecurityContext.capabilities.drop[0] | string | `"ALL"` |  |
| redis.containerSecurityContext.privileged | bool | `false` |  |
| redis.containerSecurityContext.readOnlyRootFilesystem | bool | `true` |  |
| redis.containerSecurityContext.runAsGroup | int | `999` |  |
| redis.containerSecurityContext.runAsNonRoot | bool | `true` |  |
| redis.containerSecurityContext.runAsUser | int | `999` |  |
| redis.containerSecurityContext.seccompProfile.type | string | `"RuntimeDefault"` |  |

#### Metrics

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| redis.metrics.enabled | bool | `false` | Enable Prometheus redis-exporter sidecar. |

#### Pdb

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| redis.pdb.enabled | bool | `false` | Enable PodDisruptionBudget. |
| redis.pdb.minAvailable | int | `1` |  |

#### Persistence

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| redis.persistence.enabled | bool | `true` | Enable persistent storage for Redis data. |
| redis.persistence.size | string | `"2Gi"` |  |

#### PodSecurityContext

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| redis.podSecurityContext.fsGroup | int | `999` |  |

#### Resources

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| redis.resources.limits.memory | string | `"256Mi"` |  |
| redis.resources.requests.cpu | string | `"50m"` |  |
| redis.resources.requests.memory | string | `"128Mi"` |  |

#### ServiceAccount

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| redis.serviceAccount.automountServiceAccountToken | bool | `false` |  |
| redis.serviceAccount.create | bool | `false` |  |

### Tempo

#### General

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| tempo.enabled | bool | `false` | Enable the Tempo dependency. |
| tempo.fullnameOverride | string | `"tempo"` |  |
| tempo.replicas | int | `1` |  |

#### Persistence

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| tempo.persistence.enabled | bool | `false` | Enable persistent storage for traces. |
| tempo.persistence.size | string | `"10Gi"` |  |

#### SecurityContext

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| tempo.securityContext.fsGroup | int | `10001` |  |

#### ServiceMonitor

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| tempo.serviceMonitor.enabled | bool | `false` |  |

#### Tempo

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| tempo.tempo.receivers.otlp.protocols.grpc.endpoint | string | `"0.0.0.0:4317"` |  |
| tempo.tempo.receivers.otlp.protocols.http.endpoint | string | `"0.0.0.0:4318"` |  |
| tempo.tempo.resources.limits.cpu | string | `"500m"` |  |
| tempo.tempo.resources.limits.memory | string | `"512Mi"` |  |
| tempo.tempo.resources.requests.cpu | string | `"100m"` |  |
| tempo.tempo.resources.requests.memory | string | `"256Mi"` |  |
| tempo.tempo.retention | string | `"24h"` | Trace retention window. |
| tempo.tempo.securityContext.runAsGroup | int | `10001` |  |
| tempo.tempo.securityContext.runAsNonRoot | bool | `true` |  |
| tempo.tempo.securityContext.runAsUser | int | `10001` |  |
| tempo.tempo.storage.trace.backend | string | `"local"` |  |
| tempo.tempo.storage.trace.local.path | string | `"/var/tempo/traces"` |  |
| tempo.tempo.storage.trace.wal.path | string | `"/var/tempo/wal"` |  |

### Web

#### General

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| web.affinity | object | `{}` | Affinity used for app pod. |
| web.args | list | `[]` | Web container command args. |
| web.command | list | `[]` | Web container command. |
| web.containerPort | int | `8080` | Web container port number. |
| web.containerPortName | string | `"http"` | Web container port name. |
| web.env | object | `{}` | Map or array of environment variables to inject into the app container (`valueFrom` supported). |
| web.envCm | object | `{}` | Map of environment variables to inject into a configmap loaded by the app container (`valueFrom` not supported). |
| web.envFrom | list | `[]` | Web container env variables loaded from configmap or secret reference. |
| web.envSecret | object | `{}` | Map of environment variables to inject into a secret loaded by the app container (`valueFrom` not supported). |
| web.extraContainers | list | `[]` | Extra containers to add to the app pod as sidecars. |
| web.extraPorts | list | `[]` | Web extra container ports. |
| web.hostAliases | list | `[]` | Host aliases that will be injected at pod-level into /etc/hosts. |
| web.imagePullSecrets | list | `[]` | Image credentials configuration. |
| web.initContainers | list | `[]` | Init containers to add to the app pod. |
| web.nodeSelector | object | `{}` | Default node selector for app. |
| web.podAnnotations | object | `{}` | Annotations for the app deployed pods. |
| web.podLabels | object | `{}` | Labels for the app deployed pods. |
| web.podSecurityContext | object | `{}` | Toggle and define pod-level security context. |
| web.replicaCount | int | `1` | The number of application controller pods to run. |
| web.revisionHistoryLimit | int | `10` | Revision history limit for the app. |
| web.securityContext | object | `{"allowPrivilegeEscalation":false,"capabilities":{"drop":["ALL"]},"readOnlyRootFilesystem":true,"runAsNonRoot":true,"seccompProfile":{"type":"RuntimeDefault"}}` | Toggle and define container-level security context. |
| web.statefulset | bool | `false` | Should the app run as a StatefulSet instead of a Deployment. |
| web.tolerations | list | `[]` | Default tolerations for app. |
| web.volumeClaims | list | `[]` | List of volumeClaims to add. |
| web.volumeMounts | list | `[]` | List of mounts to add (normally used with `volumes` or `volumeClaims`). |
| web.volumes | list | `[]` | List of volumes to add. |

#### Autoscaling

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| web.autoscaling.enabled | bool | `false` | Enable Horizontal Pod Autoscaler for the app. |
| web.autoscaling.maxReplicas | int | `3` | Maximum number of replicas for the app. |
| web.autoscaling.minReplicas | int | `1` | Minimum number of replicas for the app. |
| web.autoscaling.targetCPUUtilizationPercentage | int | `80` | Average CPU utilization percentage for the app. |
| web.autoscaling.targetMemoryUtilizationPercentage | int | `80` | Average memory utilization percentage for the app. |

#### GrpcRoute

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| web.grpcRoute.annotations | object | `{}` | Additional GRPCRoute annotations. |
| web.grpcRoute.enabled | bool | `false` | Enable a GRPCRoute resource for this service. |
| web.grpcRoute.hostnames | list | `[]` | Hostnames for the GRPCRoute to match. |
| web.grpcRoute.labels | object | `{}` | Additional GRPCRoute labels. |
| web.grpcRoute.parentRefs | list | `[]` | Parent references (Gateways) to attach the GRPCRoute to. |
| web.grpcRoute.rules | list | `[]` | Routing rules for the GRPCRoute. |

#### HttpRoute

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| web.httpRoute.annotations | object | `{}` | Additional HTTPRoute annotations. |
| web.httpRoute.enabled | bool | `false` | Enable an HTTPRoute resource for this service. |
| web.httpRoute.hostnames | list | `[]` | Hostnames for the HTTPRoute to match. |
| web.httpRoute.labels | object | `{}` | Additional HTTPRoute labels. |
| web.httpRoute.parentRefs | list | `[]` | Parent references (Gateways) to attach the HTTPRoute to. |
| web.httpRoute.rules | list | `[]` | Routing rules for the HTTPRoute. |

#### Image

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| web.image.pullPolicy | string | `"IfNotPresent"` | Image pull policy for the app. |
| web.image.registry | string | `"ghcr.io"` | Registry to use for the app. |
| web.image.repository | string | `"this-is-tobi/template-monorepo-ts"` | Repository to use for the app. |
| web.image.tag | string | `""` | Tag to use for the app. Overrides the image tag whose default is the chart appVersion. |

#### Ingress

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| web.ingress.annotations | object | `{}` | Additional ingress annotations. |
| web.ingress.className | string | `""` | Defines which ingress controller will implement the resource. |
| web.ingress.enabled | bool | `false` | Whether or not ingress should be enabled. |
| web.ingress.hosts[0].backend.portNumber | string | `nil` | Port used by the backend service linked to the host record (leave null to use the app service port). |
| web.ingress.hosts[0].backend.serviceName | string | `""` | Name of the backend service linked to the host record (leave empty to use the app service). |
| web.ingress.hosts[0].name | string | `"domain.local"` | Name of the host record. |
| web.ingress.hosts[0].path | string | `"/"` | Path of the host record to manage routing. |
| web.ingress.hosts[0].pathType | string | `"Prefix"` | Path type of the host record. |
| web.ingress.labels | object | `{}` | Additional ingress labels. |
| web.ingress.tls | list | `[]` | Enable TLS configuration. |

#### Metrics

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| web.metrics.enabled | bool | `false` | Deploy metrics service. |
| web.metrics.service.annotations | object | `{}` | Metrics service annotations. |
| web.metrics.service.labels | object | `{}` | Metrics service labels. |
| web.metrics.service.port | int | `9000` | Metrics service port. |
| web.metrics.service.targetPort | int | `9000` | Metrics service target port. |
| web.metrics.serviceMonitor.annotations | object | `{}` | Prometheus ServiceMonitor annotations. |
| web.metrics.serviceMonitor.enabled | bool | `false` | Enable a prometheus ServiceMonitor. |
| web.metrics.serviceMonitor.endpoints[0].basicAuth.password | string | `""` | The secret in the service monitor namespace that contains the password for authentication. |
| web.metrics.serviceMonitor.endpoints[0].basicAuth.username | string | `""` | The secret in the service monitor namespace that contains the username for authentication. |
| web.metrics.serviceMonitor.endpoints[0].bearerTokenSecret.key | string | `""` | Secret key to mount to read bearer token for scraping targets. The secret needs to be in the same namespace as the service monitor and accessible by the Prometheus Operator. |
| web.metrics.serviceMonitor.endpoints[0].bearerTokenSecret.name | string | `""` | Secret name to mount to read bearer token for scraping targets. The secret needs to be in the same namespace as the service monitor and accessible by the Prometheus Operator. |
| web.metrics.serviceMonitor.endpoints[0].honorLabels | bool | `false` | When true, honorLabels preserves the metric’s labels when they collide with the target’s labels. |
| web.metrics.serviceMonitor.endpoints[0].interval | string | `"30s"` | Prometheus ServiceMonitor interval. |
| web.metrics.serviceMonitor.endpoints[0].metricRelabelings | list | `[]` | Prometheus MetricRelabelConfigs to apply to samples before ingestion. |
| web.metrics.serviceMonitor.endpoints[0].path | string | `"/metrics"` | Path used by the Prometheus ServiceMonitor to scrape metrics. |
| web.metrics.serviceMonitor.endpoints[0].relabelings | list | `[]` | Prometheus RelabelConfigs to apply to samples before scraping. |
| web.metrics.serviceMonitor.endpoints[0].scheme | string | `""` | Prometheus ServiceMonitor scheme. |
| web.metrics.serviceMonitor.endpoints[0].scrapeTimeout | string | `"10s"` | Prometheus ServiceMonitor scrapeTimeout. If empty, Prometheus uses the global scrape timeout unless it is less than the target's scrape interval value in which the latter is used. |
| web.metrics.serviceMonitor.endpoints[0].selector | object | `{}` | Prometheus ServiceMonitor selector. |
| web.metrics.serviceMonitor.endpoints[0].tlsConfig | object | `{}` | Prometheus ServiceMonitor tlsConfig. |
| web.metrics.serviceMonitor.labels | object | `{}` | Prometheus ServiceMonitor labels. |

#### NetworkPolicy

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| web.networkPolicy.create | bool | `false` | Create NetworkPolicy object for the app. |
| web.networkPolicy.egress | list | `[]` | Egress rules for the NetworkPolicy object. |
| web.networkPolicy.ingress | list | `[]` | Ingress rules for the NetworkPolicy object. |
| web.networkPolicy.policyTypes | list | `["Ingress"]` | Policy types used in the NetworkPolicy object. |

#### Pdb

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| web.pdb.annotations | object | `{}` | Annotations to be added to app pdb. |
| web.pdb.enabled | bool | `false` | Deploy a PodDisruptionBudget for the app |
| web.pdb.labels | object | `{}` | Labels to be added to app pdb. |
| web.pdb.maxUnavailable | string | `""` | Number of pods that are unavailable after eviction as number or percentage (eg.: 50%). Has higher precedence over `web.pdb.minAvailable`. |
| web.pdb.minAvailable | string | `""` (defaults to 0 if not specified) | Number of pods that are available after eviction as number or percentage (eg.: 50%). |

#### Probes

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| web.probes.livenessProbe.failureThreshold | int | `3` | Minimum consecutive failures for the probe to be considered failed after having succeeded. |
| web.probes.livenessProbe.httpGet.path | string | `"/healthz"` | Web container healthcheck endpoint (livenessProbe is defined using `toYaml` so it is possible to override it completely). |
| web.probes.livenessProbe.httpGet.port | string | `"http"` | Port to use for healthcheck (defaults to container port). |
| web.probes.livenessProbe.initialDelaySeconds | int | `30` | Number of seconds after the container has started before probe is initiated. |
| web.probes.livenessProbe.periodSeconds | int | `30` | How often (in seconds) to perform the probe. |
| web.probes.livenessProbe.successThreshold | int | `1` | Minimum consecutive successes for the probe to be considered successful after having failed. |
| web.probes.livenessProbe.timeoutSeconds | int | `5` | Number of seconds after which the probe times out. |
| web.probes.readinessProbe.failureThreshold | int | `2` | Minimum consecutive failures for the probe to be considered failed after having succeeded. |
| web.probes.readinessProbe.httpGet.path | string | `"/healthz"` | Web container healthcheck endpoint (readinessProbe is defined using `toYaml` so it is possible to override it completely). |
| web.probes.readinessProbe.httpGet.port | string | `"http"` | Port to use for healthcheck (defaults to container port). |
| web.probes.readinessProbe.initialDelaySeconds | int | `10` | Number of seconds after the container has started before probe is initiated. |
| web.probes.readinessProbe.periodSeconds | int | `10` | How often (in seconds) to perform the probe. |
| web.probes.readinessProbe.successThreshold | int | `2` | Minimum consecutive successes for the probe to be considered successful after having failed. |
| web.probes.readinessProbe.timeoutSeconds | int | `5` | Number of seconds after which the probe times out. |
| web.probes.startupProbe.failureThreshold | int | `10` | Minimum consecutive failures for the probe to be considered failed after having succeeded. |
| web.probes.startupProbe.httpGet.path | string | `"/healthz"` | Web container healthcheck endpoint (startupProbe is defined using `toYaml` so it is possible to override it completely). |
| web.probes.startupProbe.httpGet.port | string | `"http"` | Port to use for healthcheck (defaults to container port). |
| web.probes.startupProbe.initialDelaySeconds | int | `0` | Number of seconds after the container has started before probe is initiated. |
| web.probes.startupProbe.periodSeconds | int | `10` | How often (in seconds) to perform the probe. |
| web.probes.startupProbe.successThreshold | int | `1` | Minimum consecutive successes for the probe to be considered successful after having failed. |
| web.probes.startupProbe.timeoutSeconds | int | `5` | Number of seconds after which the probe times out. |

#### Resources

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| web.resources.limits.cpu | string | `"500m"` | CPU limit for the app. |
| web.resources.limits.memory | string | `"2Gi"` | Memory limit for the app. |
| web.resources.requests.cpu | string | `"100m"` | CPU request for the app. |
| web.resources.requests.memory | string | `"256Mi"` | Memory request for the app. |

#### Service

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| web.service.extraPorts | list | `[]` | Extra service ports. |
| web.service.nodePort | int | `31002` | Port used when type is `NodePort` to expose the service on the given node port. |
| web.service.port | int | `80` | Port used by the service. |
| web.service.portName | string | `"http"` | Port name used by the service. |
| web.service.protocol | string | `"TCP"` | Protocol used by the service. |
| web.service.type | string | `"ClusterIP"` | Type of service to create for the app. |

#### ServiceAccount

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| web.serviceAccount.annotations | object | `{}` | Annotations applied to created service account. |
| web.serviceAccount.automountServiceAccountToken | bool | `false` | Should the service account access token be automount in the pod. |
| web.serviceAccount.clusterRole.create | bool | `false` | Should the clusterRole be created. |
| web.serviceAccount.clusterRole.rules | list | `[]` | ClusterRole rules associated with the service account. |
| web.serviceAccount.create | bool | `false` | Create a service account. |
| web.serviceAccount.enabled | bool | `false` | Enable the service account. |
| web.serviceAccount.name | string | `""` | Service account name. |
| web.serviceAccount.role.create | bool | `false` | Should the role be created. |
| web.serviceAccount.role.rules | list | `[]` | Role rules associated with the service account. |

#### Strategy

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| web.strategy.rollingUpdate.maxSurge | int | `1` | The maximum number of pods that can be scheduled above the desired number of pods. |
| web.strategy.rollingUpdate.maxUnavailable | int | `1` | The maximum number of pods that can be unavailable during the update process. |
| web.strategy.type | string | `"RollingUpdate"` | Strategy type used to replace old Pods by new ones, can be `Recreate` or `RollingUpdate`. |

## Sources

**Source code:**

----------------------------------------------
Autogenerated from chart metadata using [helm-docs v1.14.2](https://github.com/norwoodj/helm-docs/releases/v1.14.2)
