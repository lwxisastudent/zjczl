<template>
  <div class="header">
    <span class="title">{{ title }}</span>
    <button class="close-btn" @click="closeWindow">
      <i :class="icon"></i>
    </button>
  </div>
</template>

  
  <script>
  export default {
    props: {
        title: {
        type: String,
        required: true,
        },
    icon: {
      type: String,
      default: 'fas fa-times'
    },
    },
    methods: {
      closeWindow() {
        this.$emit('close');
      },
    },
  };
  </script>
  
  <style scoped>
.header { 
  left: 0;
  background-color: black;
  color: white;
  margin: 0;
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

button.close-btn {
  font-size: 30px;
  --bg-color: transparent;
  --border-color: transparent;
  border: none;
  color: white;
  padding: 0;
  cursor: pointer;
}
  </style>
  