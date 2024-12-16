<template>
    <div class="header">
      <span class="title">{{ title }}</span>
      <button class="close-btn" @click="closeWindow">×</button>
    </div>
  </template>
  
  <script>
  export default {
    props: {
        title: {
        type: String,
        required: true,
        },
    },
    methods: {
      closeWindow() {
        // Emit an event or call a method to navigate back to the homepage
        this.$emit('close');
      },
    },
  };
  </script>
  
  <style scoped>
.header {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  background-color: white; /* White background */
  color: black;
  padding: 0px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 999;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.title {
  font-size: 20px;
}

.close-btn {
  font-size: 30px;
  background: none;
  border: none;
  color: black;
  cursor: pointer;
}
  </style>
  