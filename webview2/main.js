import Vue from 'vue';
import App from './App.vue';

Vue.config.productionTip = false;

new Vue({
  render: h => h(App),
  data() {
    return {
      technicians: [
        {
          id: 1,
          name: '张三',
          description: '擅长修车',
          totalScore: 95,
          beautyScore: 80,
          figureScore: 85,
          skillScore: 90,
          videoLink: 'https://www.example.com/video1.mp4'
        },
        // ... 其他技师数据
      ]
    }
  }
}).$mount('#app');
