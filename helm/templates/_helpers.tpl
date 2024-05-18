{{/*
Expand the name of the chart.
*/}}
{{- define "template.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}


{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "template.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}


{{/*
Create container environment variables from configmap
*/}}
{{- define "template.env" -}}
{{ range $key, $val := .env }}
{{ $key }}: {{ $val | quote }}
{{- end }}
{{- end }}


{{/*
Create container environment variables from secret
*/}}
{{- define "template.secret" -}}
{{ range $key, $val := .secrets }}
{{ $key }}: {{ $val | b64enc | quote }}
{{- end }}
{{- end }}


{{/*
Create checksum annotation to rollout pod based on other resource sha
*/}}
{{- define "checksum" -}}
{{- $ := index . 0 }}
{{- $path := index . 1 }}
{{- $resourceType := include (print $.Template.BasePath $path) $ | fromYaml -}}
{{- if $resourceType -}}
checksum/{{ $resourceType.metadata.name }}/{{ $resourceType.kind }}: {{ $resourceType.data | toYaml | sha256sum }}
{{- end -}}
{{- end -}}


{{/*
Create the name of the service account to use
*/}}
{{- define "template.api.serviceAccountName" -}}
{{- if .Values.api.serviceAccount.create }}
{{- default (include "template.name" .) .Values.api.serviceAccount.name }}
{{- else }}
{{- default "api" .Values.api.serviceAccount.name }}
{{- end }}
{{- end }}

{{- define "template.docs.serviceAccountName" -}}
{{- if .Values.docs.serviceAccount.create }}
{{- default (include "template.name" .) .Values.docs.serviceAccount.name }}
{{- else }}
{{- default "docs" .Values.docs.serviceAccount.name }}
{{- end }}
{{- end }}


{{/*
Create image pull secret
*/}}
{{- define "template.api.imagePullSecret" }}
{{- with .Values.api.image.credentials }}
{{- printf "{\"auths\":{\"%s\":{\"username\":\"%s\",\"password\":\"%s\",\"email\":\"%s\",\"auth\":\"%s\"}}}" .registry .username .password .email (printf "%s:%s" .username .password | b64enc) | b64enc }}
{{- end }}
{{- end }}

{{- define "template.docs.imagePullSecret" }}
{{- with .Values.docs.image.credentials }}
{{- printf "{\"auths\":{\"%s\":{\"username\":\"%s\",\"password\":\"%s\",\"email\":\"%s\",\"auth\":\"%s\"}}}" .registry .username .password .email (printf "%s:%s" .username .password | b64enc) | b64enc }}
{{- end }}
{{- end }}


{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "template.api.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}-api
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}-api
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}-api
{{- end }}
{{- end }}
{{- end }}

{{- define "template.docs.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}-docs
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}-docs
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}-docs
{{- end }}
{{- end }}
{{- end }}


{{/*
Common labels
*/}}
{{- define "template.api.labels" -}}
helm.sh/chart: {{ include "template.chart" . }}
{{ include "template.api.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{- define "template.docs.labels" -}}
helm.sh/chart: {{ include "template.chart" . }}
{{ include "template.docs.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}


{{/*
Selector labels
*/}}
{{- define "template.api.selectorLabels" -}}
app.kubernetes.io/name: {{ include "template.name" . }}-api
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{- define "template.docs.selectorLabels" -}}
app.kubernetes.io/name: {{ include "template.name" . }}-docs
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
