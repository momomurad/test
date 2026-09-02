pipeline {
    agent any

    environment {
        APP_DIRECTORY = 'apps/sample-node-app'
        IMAGE_NAME = 'sample-node-app'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install dependencies') {
            steps {
                dir(env.APP_DIRECTORY) {
                    sh 'npm ci'
                }
            }
        }

        stage('Test') {
            steps {
                dir(env.APP_DIRECTORY) {
                    sh 'npm test'
                }
            }
        }

        stage('Build Docker image') {
            steps {
                dir(env.APP_DIRECTORY) {
                    sh "docker build --tag ${env.IMAGE_NAME}:${env.BUILD_NUMBER} ."
                }
            }
        }
    }
}
